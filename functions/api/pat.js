// ==========================================
// 🐾 Pat Counter API (Cloudflare Pages Function)
// Uses Cloudflare KV (Key-Value) storage to persist the count globally.
// ==========================================

// Handle GET requests (Retrieve the current pat count)
export async function onRequestGet(context) {
  const { env } = context;

  // Fetch the current count from the Cloudflare KV namespace named 'PAT_COUNTER'.
  // If no one has patted yet, this might return null.
  const count = await env.PAT_COUNTER.get("count");

  // Parse the count as an integer (base 10), defaulting to "0" if it's null.
  // Response.json() automatically sets the correct headers for you.
  return Response.json({ count: parseInt(count || "0", 10) });
}

// Handle POST requests (Increment the pat count)
export async function onRequestPost(context) {
  const { env } = context;

  // 1. Get the current count from KV storage
  const current = await env.PAT_COUNTER.get("count");
  
  // 2. Increment it by 1 (again, making sure to parse it correctly)
  const next = parseInt(current || "0", 10) + 1;

  // 3. Save the new count back to KV storage. 
  // Cloudflare KV requires values to be stored as strings or ArrayBuffers.
  await env.PAT_COUNTER.put("count", String(next));

  // 4. Return the updated count to the frontend
  return Response.json({ count: next });
}