import { supabaseServer } from '@/lib/supabase';

export async function POST(req, { params }) {
  const orderId = params.id;
  try {
    const body = await req.json();
    const payload = {
      amount_cents: Number(body.amount_cents ?? 0),
      method: String(body.method || '').toLowerCase(),
      reference: body.reference ?? null,
      evidence_urls: Array.isArray(body.evidence_urls) ? body.evidence_urls : []
    };

    // quick input checks
    if (!orderId) return Response.json({ error: 'missing order id' }, { status: 400 });
    if (!(payload.amount_cents > 0)) return Response.json({ error: 'amount_cents must be > 0' }, { status: 400 });
    if (!payload.method) return Response.json({ error: 'method required' }, { status: 400 });

    // optional: dry-run to inspect what we'd send
    const url = new URL(req.url);
    if (url.searchParams.get('dry') === '1') {
      return Response.json({ ok: true, orderId, payload });
    }

    // call your Postgres function
    const { data, error } = await supabaseServer.rpc('rr_mark_payment_text', {
      p_order_id: orderId,
      p_amount_cents: payload.amount_cents,
      p_method: payload.method,            // e.g. 'cash','venmo','cashapp','apple_cash','check','stripe'
      p_reference: payload.reference,
      p_evidence_urls: payload.evidence_urls
    });

    if (error) {
      // expose full error so we can fix quickly
      return Response.json({ step: 'rpc rr_mark_payment_text', error: error.message }, { status: 400 });
    }

    return Response.json({ payment_id: data }, { status: 200 });
  } catch (e) {
    // expose thrown error too
    return Response.json({ step: 'route catch', error: String(e?.message || e) }, { status: 500 });
  }
}
