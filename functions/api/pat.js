// ==========================================
// 🐾 Pat Counter API (Native Cloudflare KV)
// ==========================================

export async function onRequestGet(context) {
  const { env } = context;

  // Safety check: Ensure the KV namespace binding exists
  if (!env.PAT_COUNTER) {
    return Response.json({ error: "KV namespace 'PAT_COUNTER' is not bound in dashboard." }, { status: 500 });
  }

  const count = await env.PAT_COUNTER.get("count");
  return Response.json({ count: parseInt(count || "0", 10) });
}

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.PAT_COUNTER) {
    return Response.json({ error: "KV namespace 'PAT_COUNTER' is not bound in dashboard." }, { status: 500 });
  }

  // Read bundled amount from frontend
  const body = await request.json().catch(() => ({}));
  const amountToAdd = parseInt(body.amount || "1", 10);

  const current = await env.PAT_COUNTER.get("count");
  const next = parseInt(current || "0", 10) + amountToAdd;

  // Save back to native KV storage
  await env.PAT_COUNTER.put("count", String(next));

  return Response.json({ count: next });
}