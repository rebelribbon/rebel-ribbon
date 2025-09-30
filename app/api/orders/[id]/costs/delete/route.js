import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    const { cost_id } = await req.json();
    const sb = supabaseServer();
    const { error } = await sb.rpc('rr_cost_delete', { p_cost_id: cost_id });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
