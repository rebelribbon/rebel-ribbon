import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    const { cost_id, amount_cents, description, note } = await req.json();
    const sb = supabaseServer();
    const { error } = await sb.rpc('rr_cost_update', {
      p_cost_id: cost_id,
      p_amount_cents: amount_cents,
      p_description: description ?? '',
      p_note: note ?? null
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
