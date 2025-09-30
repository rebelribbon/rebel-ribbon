'use client';
import { useState } from 'react';
import { uploadPaymentEvidence } from './uploadEvidence';

export default function MarkPaidModal({ orderId, onDone }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const needsEvidence = !['cash','stripe'].includes(method);

  async function submit() {
    setBusy(true);
    try {
      let evidence_paths = [];
      if (needsEvidence && files.length) {
        evidence_paths = await uploadPaymentEvidence(orderId, files);
      }
      const amount_cents = Math.round(parseFloat(amount || '0') * 100);
      const res = await fetch(`/api/orders/${orderId}/payments/mark`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount_cents, method, reference, evidence_paths })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      onDone?.(json.payment_id);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm">Amount (USD)</label>
        <input className="border p-2 w-full" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 50.00" />
      </div>
      <div>
        <label className="block text-sm">Method</label>
        <select className="border p-2 w-full" value={method} onChange={e=>setMethod(e.target.value)}>
          <option>cash</option>
          <option>venmo</option>
          <option>cashapp</option>
          <option>apple_cash</option>
          <option>check</option>
          <option>stripe</option>
        </select>
      </div>
      <div>
        <label className="block text-sm">Reference (optional)</label>
        <input className="border p-2 w-full" value={reference} onChange={e=>setReference(e.target.value)} placeholder="txn id / note" />
      </div>
      {needsEvidence && (
        <div>
          <label className="block text-sm">Evidence (images/pdf)</label>
          <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))} />
          <p className="text-xs text-gray-500 mt-1">Required for Venmo / Cash App / Apple Cash / Check</p>
        </div>
      )}
      <button className="bg-black text-white px-4 py-2 rounded" onClick={submit} disabled={busy}>
        {busy ? 'Saving…' : 'Mark as paid'}
      </button>
    </div>
  );
}
