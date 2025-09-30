import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req, { params }) {
  try {
    const orderId = params.id;
    const { amount_cents, description, note } = await req.json();
    const sb = supabaseServer();
    const { data, error } = await sb.rpc('rr_cost_add', {
      p_order_id: orderId,
      p_amount_cents: amount_cents,
      p_description: description ?? '',
      p_note: note ?? null
    });
    if (error) throw error;
    return NextResponse.json({ id: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
