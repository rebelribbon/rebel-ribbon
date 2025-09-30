'use client';
import { supabaseClient } from '@/lib/supabase/client';

export async function uploadPaymentEvidence(orderId, files) {
  const sb = supabaseClient();
  const bucket = 'payment-evidence';
  const uploadedPaths = [];

  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `order_id/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    uploadedPaths.push(path);
  }
  return uploadedPaths;
}
