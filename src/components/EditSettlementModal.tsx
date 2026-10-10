'use client';

import React, { useState, useEffect } from 'react';
import { Scale, AlertCircle, X, CheckCircle2, RotateCcw } from 'lucide-react';

export interface SettlementEditData {
  id: string;
  settlementNumber: string;
  customerName?: string;
  karatName?: string;
  totalInWeight?: string;
  dukanLossWeight?: string;
  dollLossWeight?: string;
  makingGoldWeight?: string;
  returnedGoldWeight?: string;
  carryForwardWeight?: string;
  notes?: string;
}

interface EditSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: SettlementEditData | null;
  onSuccess: (updatedData: {
    settlement: any;
    dukanLossWeight: string;
    dollLossWeight: string;
    returnGoldWeight: string;
    makingGoldWeight: string;
    remainingBalance: string;
  }) => void;
}

export function EditSettlementModal({
  isOpen,
  onClose,
  settlement,
  onSuccess,
}: EditSettlementModalProps) {
  const [dukanLoss, setDukanLoss] = useState('');
  const [dollLoss, setDollLoss] = useState('');
  const [makingGold, setMakingGold] = useState('');
  const [returnGold, setReturnGold] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settlement) {
      setDukanLoss(settlement.dukanLossWeight || '0');
      setDollLoss(settlement.dollLossWeight || '0');
      setMakingGold(settlement.makingGoldWeight || '0');
      setReturnGold(settlement.returnedGoldWeight || '0');
      setNotes(settlement.notes || '');
      setReason('');
      setErrorMessage(null);
    }
  }, [settlement, isOpen]);

  if (!isOpen || !settlement) return null;

  const numDukan = parseFloat(dukanLoss) || 0;
  const numDoll = parseFloat(dollLoss) || 0;
  const numMaking = parseFloat(makingGold) || 0;
  const numReturn = parseFloat(returnGold) || 0;
  const totalSettledNow = (numDukan + numDoll + numMaking + numReturn).toFixed(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/settlements/${settlement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dukanLossWeight: numDukan,
          dollLossWeight: numDoll,
          makingGoldWeight: numMaking,
          returnGoldWeight: numReturn,
          notes: notes.trim() || undefined,
          reason: reason.trim() || `Corrected settlement weights (Dukan: ${numDukan.toFixed(3)}g)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settlement');
      }

      onSuccess(data);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900">
            <Scale className="w-5 h-5 text-amber-600" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">Edit Settled Order</h2>
                <span className="font-mono text-xs px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">
                  {settlement.settlementNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {settlement.customerName ? `${settlement.customerName} • ` : ''}
                {settlement.karatName || ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
            <div>
              <span className="font-bold">Correcting Entry Mistake:</span>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Updating these numbers will adjust the settlement and instantly recalculate the customer&apos;s ledger balance.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Dukan Loss */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                🔥 Dukan Loss (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={dukanLoss}
                  onChange={(e) => setDukanLoss(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Shop / melting wastage</p>
            </div>

            {/* Doll Loss */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                🌀 Doll Loss (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={dollLoss}
                  onChange={(e) => setDollLoss(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">ढोल नुकसान</p>
            </div>

            {/* Making Charge Gold */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                🔨 Making Charge (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={makingGold}
                  onChange={(e) => setMakingGold(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Making deducted in gold</p>
            </div>

            {/* Return Gold to Customer */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                🪙 Return to Customer (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={returnGold}
                  onChange={(e) => setReturnGold(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-mono">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Gold returned to client</p>
            </div>
          </div>

          {/* Real-time Total Settled Preview */}
          <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Total Settled Weight:</span>
            <span className="font-mono font-black text-sm text-amber-400">{totalSettledNow} g</span>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Reason / Remark for Correction
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Corrected Dukan loss typo from 300g to 0.300g"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save &amp; Recalculate Ledger</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
