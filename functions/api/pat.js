// ==========================================
// 🐾 Pat Counter API (External Supabase Postgres)
// Handles direct atomic increments via REST API
// ==========================================

export async function onRequestGet(context) {
  const { env } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY;

  // Fetch the global_count row from Supabase
  const response = await fetch(`${supabaseUrl}/rest/v1/pat_store?id=eq.global_count&select=count`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`
    }
  });

  const data = await response.json();
  const count = data[0]?.count || 0;

  return Response.json({ count });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY;

  // Read bundled amount from frontend (defaults to 1 if not provided)
  const body = await request.json().catch(() => ({}));
  const amountToAdd = parseInt(body.amount || "1", 10);
  
  // 1. Get current count
  const getRes = await fetch(`${supabaseUrl}/rest/v1/pat_store?id=eq.global_count&select=count`, {
    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` }
  });
  const getData = await getRes.json();
  const currentCount = getData[0]?.count || 0;
  const nextCount = currentCount + amountToAdd;

  // 2. Update database
  await fetch(`${supabaseUrl}/rest/v1/pat_store?id=eq.global_count`, {
    method: "PATCH",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ count: nextCount })
  });

  return Response.json({ count: nextCount });
}