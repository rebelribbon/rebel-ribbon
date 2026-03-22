/**
 * Unit tests for POST /api/webhooks/stripe
 * 
 * Run with: npm test -- stripe.test.js
 */

import handler from './stripe';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase/server';

jest.mock('stripe');
jest.mock('@/lib/supabase/server');

describe('POST /api/webhooks/stripe', () => {
  let mockReq, mockRes, mockSb;

  beforeEach(() => {
    mockSb = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: null,
              data: { id: 'order-uuid', order_id: '123456', payment_status: 'pending' },
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      }),
    };

    supabaseServer.mockReturnValue(mockSb);

    mockReq = {
      method: 'POST',
      headers: { 'stripe-signature': 'valid-signature' },
      body: JSON.stringify({ type: 'payment_link.completed', id: 'evt_123' }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should reject non-POST requests with 405', async () => {
    mockReq.method = 'GET';
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(405);
  });

  it('should reject missing stripe-signature header with 400', async () => {
    mockReq.headers = {};
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should reject invalid signature with 400', async () => {
    Stripe.prototype.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid signature' }));
  });

  it('should handle payment_link.completed event', async () => {
    const event = {
      type: 'payment_link.completed',
      id: 'evt_123',
      data: { object: { id: 'plink_123' } },
    };

    Stripe.prototype.webhooks.constructEvent.mockReturnValue(event);

    await handler(mockReq, mockRes);

    expect(mockSb.from).toHaveBeenCalledWith('orders');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it('should return 200 for unhandled event types', async () => {
    const event = {
      type: 'customer.created',
      id: 'evt_123',
      data: { object: {} },
    };

    Stripe.prototype.webhooks.constructEvent.mockReturnValue(event);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should handle missing order gracefully', async () => {
    const event = {
      type: 'payment_link.completed',
      id: 'evt_123',
      data: { object: { id: 'plink_unknown' } },
    };

    mockSb.from().select().eq().single.mockResolvedValue({ error: 'Not found', data: null });
    Stripe.prototype.webhooks.constructEvent.mockReturnValue(event);

    await handler(mockReq, mockRes);

    // Should still return 200 (don't want Stripe to retry)
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});
