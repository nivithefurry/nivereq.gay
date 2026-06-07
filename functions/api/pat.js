// ==========================================
// 🐾 Pat Counter API (External Supabase Postgres)
// Handles direct atomic increments via REST API
// ==========================================

export async function onRequestGet(context) {
  const { env } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/pat_store?id=eq.global_count&select=count`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    const count = data[0]?.count || 0;
    return Response.json({ count });
  } catch (err) {
    return Response.json({ error: "GET failed", message: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY;

  try {
    // Read bundled amount from frontend
    const body = await request.json().catch(() => ({}));
    const amountToAdd = parseInt(body.amount || "1", 10);
    
    // 1. Get current count
    const getRes = await fetch(`${supabaseUrl}/rest/v1/pat_store?id=eq.global_count&select=count`, {
      headers: { 
        "apikey": supabaseKey, 
        "Authorization": `Bearer ${supabaseKey}`,
        "Accept": "application/json"
      }
    });
    const getData = await getRes.json();
    const currentCount = getData[0]?.count || 0;
    const nextCount = currentCount + amountToAdd;

    // 2. Update database (PATCH)
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/pat_store?id=eq.global_count`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation" 
      },
      body: JSON.stringify({ count: nextCount })
    });

    const updateData = await updateRes.json();
    
    // Fallback to nextCount if the database returned something unexpected
    const confirmedCount = (updateData && updateData[0]) ? updateData[0].count : nextCount;

    return Response.json({ count: confirmedCount });
  } catch (err) {
    return Response.json({ error: "POST failed", message: err.message }, { status: 500 });
  }
}