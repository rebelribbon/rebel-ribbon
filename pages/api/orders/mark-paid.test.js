/**
 * Unit tests for POST /api/orders/mark-paid
 * 
 * Run with: npm test -- mark-paid.test.js
 */

import handler from './mark-paid';
import { supabaseServer } from '@/lib/supabase/server';

// Mock Supabase server client
jest.mock('@/lib/supabase/server');

describe('POST /api/orders/mark-paid', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      body: {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount_cents: 5000,
        method: 'cash',
        reference: 'manual entry',
        evidence_paths: [],
      },
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

  it('should reject missing orderId with 400', async () => {
    mockReq.body.orderId = null;
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'orderId is required' }));
  });

  it('should reject invalid amount_cents with 400', async () => {
    mockReq.body.amount_cents = -100;
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Valid amount_cents is required' }));
  });

  it('should return 404 if order not found', async () => {
    const mockSb = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ error: 'Not found', data: null }),
          }),
        }),
      }),
    };

    supabaseServer.mockReturnValue(mockSb);
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('should reject double-marking as paid with 400', async () => {
    const mockSb = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              error: null,
              data: { id: mockReq.body.orderId, payment_status: 'paid' },
            }),
          }),
        }),
      }),
    };

    supabaseServer.mockReturnValue(mockSb);
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Order is already marked as paid' }));
  });

  it('should successfully mark order as paid', async () => {
    const mockUpdatedOrder = {
      id: mockReq.body.orderId,
      payment_status: 'paid',
      payment_amount: 50,
      paid_at: expect.any(String),
    };

    const mockSb = {
      from: jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                error: null,
                data: { id: mockReq.body.orderId, payment_status: 'pending' },
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  error: null,
                  data: mockUpdatedOrder,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }),
    };

    supabaseServer.mockReturnValue(mockSb);
    await handler(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      payment_id: mockReq.body.orderId,
    }));
  });
});
