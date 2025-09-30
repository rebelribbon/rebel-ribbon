import { createClient } from '@supabase/supabase-js';

function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function GET(_req, ctx) {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.rpc('rr_get_now'); // create this tiny sql func if needed
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e) {
    return new Response(e.message, { status: 400 });
  }
}
