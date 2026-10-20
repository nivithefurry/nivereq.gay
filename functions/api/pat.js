function missingCounterBinding() {
  return Response.json({ error: "KV namespace 'PAT_COUNTER' is not bound." }, { status: 500 });
}

export async function onRequestGet({ env }) {
  if (!env.PAT_COUNTER) return missingCounterBinding();
  const count = await env.PAT_COUNTER.get("count");
  return Response.json({ count: Number.parseInt(count || "0", 10) });
}

export async function onRequestPost({ env, request }) {
  if (!env.PAT_COUNTER) return missingCounterBinding();
  const body = await request.json().catch(() => ({}));
  const amountToAdd = Number.parseInt(body.amount || "1", 10);
  const currentCount = await env.PAT_COUNTER.get("count");
  const nextCount = Number.parseInt(currentCount || "0", 10) + amountToAdd;
  await env.PAT_COUNTER.put("count", String(nextCount));
  return Response.json({ count: nextCount });
}
