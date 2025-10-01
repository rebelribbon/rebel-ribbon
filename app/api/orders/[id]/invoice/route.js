import { supabaseServer } from '@/lib/supabase';

export async function GET(_req, { params }) {
  try {
    const orderId = params.id;

    const { data: order, error } = await supabaseServer
      .from('orders')
      .select(`
        id,
        status,
        substatus,
        total_amount,
        amount_paid,
        tax_amount,
        subtotal_cents,
        discount_cents,
        delivery_fee,
        rush_fee,
        event_date,
        pickup_date,
        delivery_date,
        pickup_or_delivery,
        referral_code,
        created_at
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      return new Response(JSON.stringify({ step: 'select order', error: error.message }), { status: 400 });
    }
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    const balance_due =
      Number(order?.total_amount ?? 0) - Number(order?.amount_paid ?? 0);

    const invoice = {
      order,
      totals: {
        subtotal_cents: order.subtotal_cents,
        discount_cents: order.discount_cents,
        tax_amount: order.tax_amount,
        delivery_fee: order.delivery_fee,
        rush_fee: order.rush_fee,
        total_amount: order.total_amount,
        amount_paid: order.amount_paid,
        balance_due
      }
    };

    return new Response(JSON.stringify(invoice), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
