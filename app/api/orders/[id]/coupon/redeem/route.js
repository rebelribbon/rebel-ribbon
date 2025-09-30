import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req, { params }) {
  try {
    const orderId = params.id;
    const { code } = await req.json();
    const sb = supabaseServer();
    const { data, error } = await sb.rpc('rr_redeem_coupon', {
      p_order_id: orderId,
      p_code: code
    });
    if (error) throw error;
    return NextResponse.json({ redemption_id: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
