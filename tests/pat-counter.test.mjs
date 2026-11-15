import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const apiSource = await readFile(new URL("../functions/api/pat.js", import.meta.url), "utf8");
const { onRequestGet, onRequestPost } = await import(`data:text/javascript;base64,${Buffer.from(apiSource).toString("base64")}`);

function makeKV(initialCount = "0") {
  const values = new Map([["count", initialCount]]);
  return {
    async get(key) { return values.get(key) ?? null; },
    async put(key, value) { values.set(key, value); },
    values,
  };
}

function makeApiRequest({ origin = "https://site.example", body = { amount: 1 } } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin !== null) headers.Origin = origin;
  return new Request("https://site.example/api/pat", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

class FakeElement {
  constructor() {
    this.textContent = "";
    this.disabled = false;
    this.listeners = {};
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
    };
  }

  addEventListener(type, callback) {
    this.listeners[type] = callback;
  }

  get offsetWidth() {
    return 1;
  }
}

async function settleMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test("GET returns the current KV total; successful pats increment it", async () => {
  const env = { PAT_COUNTER: makeKV("41") };
  const initial = await onRequestGet({ env });
  assert.deepEqual(await initial.json(), { success: true, count: 41 });

  const response = await onRequestPost({ env, request: makeApiRequest({ body: { amount: 3 } }) });
  assert.deepEqual(await response.json(), { success: true, accepted: true, count: 44 });
  assert.equal(await env.PAT_COUNTER.get("count"), "44");
});

test("pats have no application rate limit", async () => {
  const env = { PAT_COUNTER: makeKV("0") };
  let response;
  for (let index = 0; index < 150; index += 1) {
    response = await onRequestPost({ env, request: makeApiRequest() });
    assert.equal(response.status, 200);
  }
  assert.deepEqual(await response.json(), { success: true, accepted: true, count: 150 });
});

test("cross-origin and missing-Origin requests are rejected without changing KV", async () => {
  const env = { PAT_COUNTER: makeKV("8") };
  const crossOrigin = await onRequestPost({ env, request: makeApiRequest({ origin: "https://attacker.example" }) });
  assert.equal(crossOrigin.status, 403);
  const missingOrigin = await onRequestPost({ env, request: makeApiRequest({ origin: null }) });
  assert.equal(missingOrigin.status, 403);
  assert.equal(await env.PAT_COUNTER.get("count"), "8");
});

test("invalid input and storage errors do not change the count", async () => {
  const kv = makeKV("12");
  const env = { PAT_COUNTER: kv };
  const invalid = await onRequestPost({ env, request: makeApiRequest({ body: { amount: 11 } }) });
  assert.equal(invalid.status, 400);
  assert.equal(await kv.get("count"), "12");

  const brokenEnv = { PAT_COUNTER: { get: async () => "12", put: async () => { throw new Error("KV unavailable"); } } };
  const failed = await onRequestPost({ env: brokenEnv, request: makeApiRequest() });
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).success, false);
});

test("Last.fm API rejects cross-origin requests and allows same-origin frontend fetches", async () => {
  const lastFmSource = await readFile(new URL("../functions/api/lastfm.js", import.meta.url), "utf8");
  const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(lastFmSource).toString("base64")}`);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    recenttracks: { track: [{ name: "Test track", artist: { "#text": "Test artist" } }] },
  });
  const env = { LASTFM_USER: "test-user", LASTFM_KEY: "test-key" };
  const request = (headers) => new Request("https://nivereq.cafe/api/lastfm", { headers });
  try {
    const crossOrigin = await onRequest({
      env,
      request: request({ Origin: "https://attacker.example", "x-internal-request": "yes" }),
    });
    assert.equal(crossOrigin.status, 403);

    const crossSiteFetch = await onRequest({
      env,
      request: request({ "sec-fetch-site": "cross-site", "x-internal-request": "yes" }),
    });
    assert.equal(crossSiteFetch.status, 403);

    const sameOrigin = await onRequest({
      env,
      request: request({ Origin: "https://nivereq.cafe", "x-internal-request": "yes" }),
    });
    assert.equal(sameOrigin.status, 200);
    assert.deepEqual(await sameOrigin.json(), {
      artist: "Test artist",
      name: "Test track",
      albumArt: null,
      nowPlaying: false,
      date: null,
      url: null,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Discord avatar endpoint resolves the current animated avatar and can fall back to default", async () => {
  const avatarSource = await readFile(new URL("../functions/api/discord-avatar.js", import.meta.url), "utf8");
  const { onRequestGet } = await import(`data:text/javascript;base64,${Buffer.from(avatarSource).toString("base64")}`);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      success: true,
      data: { discord_user: { id: "1305678814046588949", avatar: "a_0123456789abcdef" } },
    });
    const animated = await onRequestGet();
    assert.equal(animated.status, 200);
    assert.deepEqual(await animated.json(), {
      success: true,
      url: "https://cdn.discordapp.com/avatars/1305678814046588949/a_0123456789abcdef.gif?size=512",
    });

    globalThis.fetch = async () => Response.json({
      success: true,
      data: { discord_user: { id: "1305678814046588949", avatar: null } },
    });
    const defaultAvatar = await onRequestGet();
    assert.equal(defaultAvatar.status, 200);
    assert.match((await defaultAvatar.json()).url, /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/\d\.png$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("frontend keeps the confirmed count on errors and accepts a later retry", async () => {
  const source = await readFile(new URL("../public/js/Utility/pat.js", import.meta.url), "utf8");
  const avatar = new FakeElement();
  const button = new FakeElement();
  const count = new FakeElement();
  const message = new FakeElement();
  const timeouts = new Map();
  const requests = [];
  let timerId = 0;
  const response = (status, body) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  });
  const fetch = (_url, options = {}) => {
    if (!options.method) return Promise.resolve(response(200, { success: true, count: 40 }));
    return new Promise((resolve, reject) => requests.push({ options, resolve, reject }));
  };
  const window = {
    setTimeout(callback, delay) {
      const id = ++timerId;
      timeouts.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timeouts.delete(id); },
  };
  const document = {
    documentElement: { lang: "en" },
    querySelector: (selector) => selector === ".hero-avatar" ? avatar : button,
    getElementById: (id) => id === "pat-count" ? count : message,
  };
  vm.runInNewContext(source, { document, window, fetch, console: { info() {} }, Date });
  await settleMicrotasks();
  assert.equal(count.textContent, "40");

  avatar.listeners.click();
  avatar.listeners.click();
  const firstTimer = [...timeouts].find(([, timer]) => timer.delay === 450);
  timeouts.delete(firstTimer[0]);
  firstTimer[1].callback();
  await settleMicrotasks();
  assert.equal(JSON.parse(requests[0].options.body).amount, 2);
  requests[0].resolve(response(200, { success: true, accepted: true, count: 42 }));
  await settleMicrotasks();
  assert.equal(count.textContent, "42");

  avatar.listeners.click();
  const secondTimer = [...timeouts].find(([, timer]) => timer.delay === 450);
  timeouts.delete(secondTimer[0]);
  secondTimer[1].callback();
  await settleMicrotasks();
  requests[1].reject(new Error("network offline"));
  await settleMicrotasks();
  assert.equal(count.textContent, "42");
  assert.match(message.textContent, /did not sync/);

  avatar.listeners.click();
  const thirdTimer = [...timeouts].find(([, timer]) => timer.delay === 450);
  timeouts.delete(thirdTimer[0]);
  thirdTimer[1].callback();
  await settleMicrotasks();
  requests[2].resolve(response(200, { success: true, accepted: true, count: 43 }));
  await settleMicrotasks();
  assert.equal(count.textContent, "43");
});
