const MAX_BATCH = 10;

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function unavailable() {
  return json({ success: false, error: "PAT_COUNTER_UNAVAILABLE" }, 503);
}

function parseCount(value) {
  const count = Number(value ?? 0);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export async function onRequestGet({ env }) {
  if (!env.PAT_COUNTER) return unavailable();
  try {
    const count = parseCount(await env.PAT_COUNTER.get("count"));
    if (count === null) return unavailable();
    return json({ success: true, count });
  } catch {
    return unavailable();
  }
}

export async function onRequestPost({ env, request }) {
  if (!env.PAT_COUNTER) return unavailable();

  const origin = request.headers.get("Origin");
  if (!origin) {
    return json({ success: false, error: "ORIGIN_REQUIRED" }, 403);
  }
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return json({ success: false, error: "CROSS_ORIGIN" }, 403);
    }
  } catch {
    return json({ success: false, error: "INVALID_ORIGIN" }, 403);
  }

  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") || "")) {
    return json({ success: false, error: "INVALID_CONTENT_TYPE" }, 415);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ success: false, error: "INVALID_BODY" }, 400);
  }
  const amount = body.amount === undefined ? 1 : body.amount;
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_BATCH) {
    return json({ success: false, error: "INVALID_AMOUNT" }, 400);
  }

  try {
    const current = parseCount(await env.PAT_COUNTER.get("count"));
    if (current === null || current + amount > Number.MAX_SAFE_INTEGER) return unavailable();
    const count = current + amount;
    await env.PAT_COUNTER.put("count", String(count));
    return json({ success: true, accepted: true, count });
  } catch {
    return unavailable();
  }
}
