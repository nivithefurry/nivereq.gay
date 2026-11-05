const MAX_BATCH = 10;
const PER_MINUTE_LIMIT = 20;
const PER_DAY_LIMIT = 100;

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function missingCounterBinding() {
  return json({ error: "KV namespace 'PAT_COUNTER' is not bound." }, 500);
}

async function clientKey(request) {
  // Cloudflare supplies this header at the edge. Hash it so raw IPs are not stored in KV keys.
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeLimit(kv, key, limit, ttl, amount) {
  const used = Number.parseInt((await kv.get(key)) || "0", 10);
  if (used + amount > limit) return false;
  await kv.put(key, String(used + amount), { expirationTtl: ttl });
  return true;
}

async function rateLimit(request, env, amount) {
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const day = Math.floor(now / 86_400_000);
  const id = await clientKey(request);

  // KV counters are intentionally coarse: enough to stop casual scripts, not a transactional
  // abuse-control system. Use a Durable Object or Cloudflare Rate Limiting for strict quotas.
  const minuteKey = `pat-limit:m:${id}:${minute}`;
  const dayKey = `pat-limit:d:${id}:${day}`;
  if (!(await consumeLimit(env.PAT_COUNTER, minuteKey, PER_MINUTE_LIMIT, 120, amount))) {
    return json({ error: "Too many pats. Try again in a minute." }, 429, { "Retry-After": "60" });
  }
  if (!(await consumeLimit(env.PAT_COUNTER, dayKey, PER_DAY_LIMIT, 172_800, amount))) {
    return json({ error: "Daily pat limit reached. Try again tomorrow." }, 429, { "Retry-After": "86400" });
  }
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.PAT_COUNTER) return missingCounterBinding();
  const count = await env.PAT_COUNTER.get("count");
  return json({ count: Math.max(0, Number.parseInt(count || "0", 10) || 0) });
}

export async function onRequestPost({ env, request }) {
  if (!env.PAT_COUNTER) return missingCounterBinding();

  // Reject cross-site browser submissions. This does not authenticate callers; the IP quota
  // and server-side amount cap are what constrain direct requests.
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ error: "Cross-origin request rejected." }, 403);
  }

  const body = await request.json().catch(() => null);
  const amount = body?.amount === undefined ? 1 : Number(body.amount);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_BATCH) {
    return json({ error: `Amount must be an integer from 1 to ${MAX_BATCH}.` }, 400);
  }

  const limited = await rateLimit(request, env, amount);
  if (limited) return limited;

  const current = Number.parseInt((await env.PAT_COUNTER.get("count")) || "0", 10) || 0;
  const next = current + amount;
  await env.PAT_COUNTER.put("count", String(next));
  return json({ count: next });
}
