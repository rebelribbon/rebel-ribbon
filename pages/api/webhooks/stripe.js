/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events:
 * - payment_link.completed
 * - checkout.session.completed
 * - payment_intent.succeeded
 * 
 * Matches incoming webhooks to orders via stripe_payment_link_id
 * and updates order payment status to 'paid'.
 */

import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: {
      raw: { type: 'application/json' },
    },
  },
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate webhook signature
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Initialize Supabase
    const sb = supabaseServer();

    // Handle different event types
    switch (event.type) {
      case 'payment_link.completed':
        await handlePaymentLinkCompleted(event.data.object, sb);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, sb);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, sb);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, sb);
        break;

      default:
        // Acknowledge unhandled events
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log webhook event
    const { error: logError } = await sb.from('payment_logs').insert({
      order_id: null, // Will be populated by specific handlers
      event_type: event.type,
      stripe_event_id: event.id,
      payload: event.data.object,
    });

    if (logError) {
      console.warn('Failed to log webhook event:', logError);
      // Don't fail the response — Stripe needs 200 OK
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle payment_link.completed event
 * Triggered when customer completes payment via a Stripe Payment Link
 */
async function handlePaymentLinkCompleted(paymentLink, sb) {
  try {
    console.log(`Payment link completed: ${paymentLink.id}`);

    // Find order by stripe_payment_link_id
    const { data: order, error: findError } = await sb
      .from('orders')
      .select('id, order_id, payment_status')
      .eq('stripe_payment_link_id', paymentLink.id)
      .single();

    if (findError || !order) {
      console.warn(`Order not found for payment link: ${paymentLink.id}`);
      return;
    }

    // Update order to paid
    const { error: updateError } = await sb
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return;
    }

    console.log(`Order ${order.order_id} marked as paid via payment link`);

    // Log the success
    await sb.from('payment_logs').update({
      order_id: order.id,
    }).eq('stripe_event_id', paymentLink.id);

  } catch (error) {
    console.error('Error handling payment_link.completed:', error);
  }
}

/**
 * Handle checkout.session.completed event
 * Triggered when customer completes checkout session
 */
async function handleCheckoutSessionCompleted(session, sb) {
  try {
    console.log(`Checkout session completed: ${session.id}`);

    // Try to find order by checkout session ID first
    const { data: order, error: findError } = await sb
      .from('orders')
      .select('id, order_id, payment_status')
      .eq('stripe_checkout_session_id', session.id)
      .single();

    if (findError || !order) {
      console.warn(`Order not found for checkout session: ${session.id}`);
      return;
    }

    // Update order to paid
    const { error: updateError } = await sb
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return;
    }

    console.log(`Order ${order.order_id} marked as paid via checkout session`);

  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

/**
 * Handle payment_intent.succeeded event
 * Triggered when a payment intent succeeds
 * Fallback for cases where payment link/session metadata is not available
 */
async function handlePaymentIntentSucceeded(paymentIntent, sb) {
  try {
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);

    // Try to find order by payment intent ID
    const { data: order, error: findError } = await sb
      .from('orders')
      .select('id, order_id, payment_status')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (findError || !order) {
      console.warn(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Update order to paid
    const { error: updateError } = await sb
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return;
    }

    console.log(`Order ${order.order_id} marked as paid via payment intent`);

  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

/**
 * Handle charge.refunded event
 * Update order status if a payment is refunded
 */
async function handleChargeRefunded(charge, sb) {
  try {
    console.log(`Charge refunded: ${charge.id}`);

    // Find order by payment intent (charges belong to payment intents)
    if (!charge.payment_intent) {
      console.warn('Refunded charge has no payment_intent');
      return;
    }

    const { data: order, error: findError } = await sb
      .from('orders')
      .select('id, order_id, payment_status')
      .eq('stripe_payment_intent_id', charge.payment_intent)
      .single();

    if (findError || !order) {
      console.warn(`Order not found for refunded charge: ${charge.id}`);
      return;
    }

    // Update order to refunded
    const { error: updateError } = await sb
      .from('orders')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order refund status:', updateError);
      return;
    }

    console.log(`Order ${order.order_id} marked as refunded`);

  } catch (error) {
    console.error('Error handling charge.refunded:', error);
  }
}
