# Webhook Endpoints

This directory contains webhook handlers for third-party integrations.

## Stripe Webhooks

### Endpoint
`POST /api/webhooks/stripe`

### Events Handled
- `payment_link.completed` — Payment Link payment succeeded
- `checkout.session.completed` — Checkout session completed
- `payment_intent.succeeded` — Payment intent succeeded
- `charge.refunded` — Charge was refunded

### Order Matching Strategy

The webhook handler attempts to match incoming Stripe events to orders using the following priority:

1. **stripe_payment_link_id** — Matched against `payment_link.id` in the event
2. **stripe_checkout_session_id** — Matched against `checkout.session.id`
3. **stripe_payment_intent_id** — Matched against `payment_intent.id`

### Security

The handler validates every webhook using the Stripe webhook signature (`stripe-signature` header) and the webhook secret. Requests without valid signatures are rejected with HTTP 400.

### Processing

When a webhook event is received:
1. Signature is validated
2. Event type is checked
3. Corresponding order is looked up in the database
4. Order status is updated to `paid` (or `refunded` for refund events)
5. Event is logged to the `payment_logs` table for audit purposes
6. Response 200 OK is returned to Stripe

### Configuration

Required environment variables:
- `STRIPE_SECRET_KEY` — Stripe Secret API Key
- `STRIPE_WEBHOOK_SECRET` — Webhook endpoint signing secret

These must be configured in your deployment environment.
