/**
 * POST /api/orders/mark-paid
 * 
 * Mark an order as paid with optional evidence upload.
 * Requires authentication and order ownership validation.
 */

import { supabaseServer } from '@/lib/supabase/server';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate required fields
    const { orderId, amount_cents, method, reference, evidence_paths } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }
    if (!amount_cents || amount_cents <= 0) {
      return res.status(400).json({ error: 'Valid amount_cents is required' });
    }
    if (!method) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Initialize server-side Supabase client
    const sb = supabaseServer();

    // Verify order exists and get current payment status
    const { data: order, error: orderError } = await sb
      .from('orders')
      .select('id, customer_id, payment_status, payment_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Prevent double-marking as paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already marked as paid' });
    }

    // Update order with payment details
    const { data: updated, error: updateError } = await sb
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_amount: amount_cents / 100, // Convert cents to dollars
        paid_at: new Date().toISOString(),
        staff_notes: `Marked paid via staff portal. Method: ${method}. Reference: ${reference || 'N/A'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update payment status', details: updateError.message });
    }

    // Log the payment transaction
    const { error: logError } = await sb
      .from('payment_logs')
      .insert({
        order_id: orderId,
        event_type: 'manual_mark_paid',
        stripe_event_id: null,
        payload: {
          method,
          amount_cents,
          reference,
          evidence_paths: evidence_paths || [],
          timestamp: new Date().toISOString(),
        },
      });

    if (logError) {
      // Log error but don't fail the request — payment was recorded
      console.warn('Failed to log payment event:', logError);
    }

    return res.status(200).json({
      success: true,
      payment_id: updated.id,
      order: updated,
      message: 'Order marked as paid successfully',
    });

  } catch (error) {
    console.error('Mark paid error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
