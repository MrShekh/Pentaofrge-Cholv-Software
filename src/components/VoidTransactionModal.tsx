'use client';

import React, { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';

interface VoidTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  transaction: {
    id: string;
    transactionNumber: string;
    type: string;
    weight: string;
    customerName?: string;
    karatName?: string;
  } | null;
}

export function VoidTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}: VoidTransactionModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('A reason is required to void this transaction');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to void transaction');
      }

      onSuccess(`Transaction ${transaction.transactionNumber} marked as VOID. Balances updated.`);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error voiding transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-red-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50/50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold">Void Transaction (Undo Protection)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            In jewellery gold tracking, transactions are never deleted. Voiding will permanently
            mark <strong>{transaction.transactionNumber}</strong> as <span className="text-red-600 font-bold">VOID</span>,
            exclude its {transaction.weight}g from active running balances, and log your audit reason.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div>
              <span className="text-slate-500">Entry:</span>{' '}
              <strong>
                {transaction.weight}g {transaction.type}
              </strong>
            </div>
            {transaction.customerName && (
              <div>
                <span className="text-slate-500">Customer:</span>{' '}
                <strong>{transaction.customerName}</strong> ({transaction.karatName})
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Reason for Void *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Incorrect weight entered by mistake, customer revised lot"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Voiding...' : 'Confirm Void'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
