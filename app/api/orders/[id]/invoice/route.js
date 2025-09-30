import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(_req, { params }) {
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.rpc('rr_invoice_json', { p_order_id: params.id });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
