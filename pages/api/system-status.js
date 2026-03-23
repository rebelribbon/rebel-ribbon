/**
 * GET /api/system-status
 * 
 * Returns current system health status including:
 * - Last Stripe webhook received timestamp
 * - System status overall
 * 
 * Used by staff UI to display health banner
 */

import { supabaseServer } from '@/lib/supabase/server';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sb = supabaseServer();

    // Get the latest system status record
    const { data: status, error: statusError } = await sb
      .from('system_status')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (statusError) {
      // If table doesn't exist yet, return default status
      return res.status(200).json({
        status: 'unknown',
        last_webhook_received_at: null,
        message: 'System status unavailable'
      });
    }

    // Calculate health indicators
    const now = new Date();
    const lastWebhookTime = status.last_webhook_received_at 
      ? new Date(status.last_webhook_received_at) 
      : null;
    
    let health_status = 'green';
    let webhook_status = 'unknown';

    if (lastWebhookTime) {
      const hours_since = (now - lastWebhookTime) / (1000 * 60 * 60);
      
      if (hours_since < 24) {
        webhook_status = 'green';
      } else if (hours_since < 72) {
        webhook_status = 'yellow';
        health_status = 'yellow';
      } else {
        webhook_status = 'red';
        health_status = 'red';
      }
    }

    return res.status(200).json({
      status: health_status,
      webhook_status,
      last_webhook_received_at: status.last_webhook_received_at,
      hours_since_webhook: lastWebhookTime 
        ? Math.floor((now - lastWebhookTime) / (1000 * 60 * 60))
        : null,
      updated_at: status.updated_at
    });

  } catch (error) {
    console.error('System status error:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve system status',
      status: 'unknown'
    });
  }
}
