import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req, { params }) {
  try {
    const orderId = params.id;
    const { amount_cents, method, reference, evidence_paths } = await req.json();
    const sb = supabaseServer();
    const { data, error } = await sb.rpc('rr_mark_payment_text', {
      p_order_id: orderId,
      p_amount_cents: amount_cents,
      p_method: method,              // must be one of: 'stripe','apple_cash','cashapp','venmo','check','cash'
      p_reference: reference ?? null,
      p_evidence_paths: evidence_paths ?? []  // array of storage paths
    });
    if (error) throw error;
    return NextResponse.json({ payment_id: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
