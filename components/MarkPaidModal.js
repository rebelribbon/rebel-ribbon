'use client';
import { useState } from 'react';
import { uploadPaymentEvidence } from './uploadEvidence';

export default function MarkPaidModal({ orderId, onDone }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [success, setSuccess] = useState(false);
  const needsEvidence = !['cash', 'stripe'].includes(method);

  async function submit() {
    setBusy(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate inputs
      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      let evidence_paths = [];
      if (needsEvidence && files.length) {
        evidence_paths = await uploadPaymentEvidence(orderId, files);
      }

      const amount_cents = Math.round(parseFloat(amount) * 100);

      // Call the new API endpoint
      const res = await fetch('/api/orders/mark-paid', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          amount_cents, 
          method, 
          reference, 
          evidence_paths 
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Failed to mark order as paid (${res.status})`);
      }

      setSuccess(true);
      setAmount('');
      setReference('');
      setFiles([]);
      setMethod('cash');

      // Call parent callback after 1s to show success message
      setTimeout(() => {
        onDone?.(json.payment_id);
      }, 1000);

    } catch (e) {
      setError(e.message || 'An unexpected error occurred');
      console.error('Mark paid error:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 space-y-3">
      {error && !errorDismissed && (
        <div className="bg-red-100 border-l-4 border-red-600 rounded p-4 text-sm text-red-900 sticky top-0 z-50">
          <div className="flex items-start gap-3">
            <div className="text-xl">⚠️</div>
            <div className="flex-1">
              <strong className="block mb-1">PAYMENT FAILED - ORDER NOT UPDATED</strong>
              <p className="mb-3">{error}</p>
              <p className="text-xs mb-3">The payment was NOT marked in the system. Please verify the transaction completed before trying again.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setErrorDismissed(true)}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => submit()}
                  disabled={busy}
                  className="text-xs bg-red-700 text-white px-3 py-1 rounded hover:bg-red-800 disabled:opacity-50"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
          ✓ Order marked as paid successfully
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Amount (USD)</label>
        <input
          className="border p-2 w-full rounded"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50.00"
          disabled={busy}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Payment Method</label>
        <select
          className="border p-2 w-full rounded"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          disabled={busy}
        >
          <option value="cash">Cash</option>
          <option value="venmo">Venmo</option>
          <option value="cashapp">Cash App</option>
          <option value="apple_cash">Apple Cash</option>
          <option value="check">Check</option>
          <option value="stripe">Stripe</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Reference (optional)</label>
        <input
          className="border p-2 w-full rounded"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Transaction ID or note"
          disabled={busy}
        />
      </div>

      {needsEvidence && (
        <div>
          <label className="block text-sm font-medium">Evidence (images/PDF)</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            disabled={busy}
          />
          <p className="text-xs text-gray-500 mt-1">
            Required for Venmo / Cash App / Apple Cash / Check
          </p>
        </div>
      )}

      <button
        className="w-full bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={submit}
        disabled={busy || !amount || success}
      >
        {busy ? 'Processing…' : success ? 'Done' : 'Mark as Paid'}
      </button>
    </div>
  );
}
