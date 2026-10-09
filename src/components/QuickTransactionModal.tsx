'use client';

import React, { useState, useEffect } from 'react';
import { TransactionType } from '@prisma/client';
import { X, AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  shopName: string | null;
  phone: string;
}

interface Karat {
  id: string;
  name: string;
  value: string;
}

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  initialType?: TransactionType;
  initialCustomerId?: string;
  initialKaratId?: string;
}

export function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = TransactionType.IN,
  initialCustomerId,
  initialKaratId,
}: QuickTransactionModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [karats, setKarats] = useState<Karat[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedKaratId, setSelectedKaratId] = useState<string>('');
  const [type, setType] = useState<TransactionType>(initialType);
  const [weight, setWeight] = useState<string>('');
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState<string>(getLocalDate);
  const [time, setTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState<string>('');

  // Balance checking
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Confirmation step
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Override state
  const [allowOverride, setAllowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [requiresOverride, setRequiresOverride] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(getLocalDate());
      const now = new Date();
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      fetch('/api/customers')
        .then((res) => res.json())
        .then((data) => {
          if (data.customers) setCustomers(data.customers);
        })
        .catch(console.error);

      fetch('/api/settings/karats')
        .then((res) => res.json())
        .then((data) => {
          if (data.karats) {
            setKarats(data.karats);
            if (!initialKaratId && data.karats.length > 0 && !selectedKaratId) {
              setSelectedKaratId(data.karats[0].id);
            }
          }
        })
        .catch(console.error);

      setSelectedCustomerId(initialCustomerId || '');
      if (initialKaratId) {
        setSelectedKaratId(initialKaratId);
      }
      setType(initialType || TransactionType.IN);
      setWeight('');
      setNotes('');
      setShowConfirmation(false);
      setErrorMessage(null);
      setAllowOverride(false);
      setOverrideReason('');
      setRequiresOverride(false);
    } else {
      setCurrentBalance(null);
      setShowConfirmation(false);
    }
  }, [isOpen, initialCustomerId, initialKaratId, initialType]);

  // Fetch balance whenever modal is open and customer or karat is selected
  useEffect(() => {
    if (isOpen && selectedCustomerId && selectedKaratId) {
      setIsLoadingBalance(true);
      fetch(`/api/customers/${selectedCustomerId}/karats/${selectedKaratId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch balance');
          return res.json();
        })
        .then((data) => {
          if (data.summary && data.summary.currentBalance !== undefined) {
            setCurrentBalance(parseFloat(data.summary.currentBalance));
          } else {
            setCurrentBalance(0);
          }
        })
        .catch((err) => {
          console.error('Error fetching balance:', err);
          setCurrentBalance(0);
        })
        .finally(() => setIsLoadingBalance(false));
    } else if (!isOpen) {
      setCurrentBalance(null);
    }
  }, [isOpen, selectedCustomerId, selectedKaratId]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedKarat = karats.find((k) => k.id === selectedKaratId);

  const numWeight = parseFloat(weight) || 0;
  const isOut = type === TransactionType.OUT;
  const newBalance =
    currentBalance !== null
      ? type === TransactionType.IN
        ? currentBalance + numWeight
        : currentBalance - numWeight
      : null;

  const wouldGoNegative = isOut && currentBalance !== null && currentBalance < numWeight;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLoadingBalance) {
      setErrorMessage('Checking latest ledger balance, please wait a moment...');
      return;
    }

    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer');
      return;
    }
    if (!selectedKaratId) {
      setErrorMessage('Please select a karat');
      return;
    }
    if (!numWeight || numWeight <= 0) {
      setErrorMessage('Please enter a valid weight greater than 0');
      return;
    }

    if (wouldGoNegative) {
      setRequiresOverride(true);
    } else {
      setRequiresOverride(false);
    }

    setShowConfirmation(true);
  };

  const handleFinalSubmit = async () => {
    if (requiresOverride && !allowOverride) {
      setErrorMessage('You must check "Allow adjustment override" to proceed with this OUT entry.');
      return;
    }
    if (requiresOverride && allowOverride && !overrideReason.trim()) {
      setErrorMessage('Please provide a reason for the adjustment override.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const fullDate = new Date(`${date}T${time}:00`);

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          karatId: selectedKaratId,
          type,
          weight: numWeight,
          transactionDate: fullDate.toISOString(),
          notes,
          allowOverride,
          overrideReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record transaction');
      }

      onSuccess(data.message || 'Transaction saved successfully');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record transaction';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                type === TransactionType.IN ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {type === TransactionType.IN ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {showConfirmation
                  ? 'Confirm Transaction'
                  : type === TransactionType.IN
                  ? 'Receive Gold (IN Entry)'
                  : 'Return Completed Work (OUT Entry)'}
              </h2>
              <p className="text-xs text-slate-500">Fast jewellery running ledger entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>{errorMessage}</div>
          </div>
        )}

        {!showConfirmation ? (
          /* Transaction Entry Form */
          <form onSubmit={handleProceedToConfirm} className="p-6 space-y-4">
            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setType(TransactionType.IN)}
                className={`py-2 text-sm font-semibold rounded-md transition ${
                  type === TransactionType.IN
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + IN (Received)
              </button>
              <button
                type="button"
                onClick={() => setType(TransactionType.OUT)}
                className={`py-2 text-sm font-semibold rounded-md transition ${
                  type === TransactionType.OUT
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                − OUT (Finished Return)
              </button>
            </div>

            {/* Customer Searchable Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Customer *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Karat Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Karat Grade *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {karats.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setSelectedKaratId(k.id)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                      selectedKaratId === k.id
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Balance Display */}
            {selectedCustomerId && selectedKaratId && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">Current {selectedKarat?.name} Available:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {isLoadingBalance ? 'Loading...' : `${(currentBalance || 0).toFixed(3)} g`}
                </span>
              </div>
            )}

            {/* Weight Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Weight in Grams *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-10"
                />
                <span className="absolute right-3 top-3 text-sm font-semibold text-slate-400">g</span>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Order Name / Remark */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Order Name / Remark
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoadingBalance}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg text-white shadow-sm transition disabled:opacity-50 ${
                  type === TransactionType.IN
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoadingBalance ? 'Checking Balance...' : 'Review & Confirm'}
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Screen */
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-sm text-slate-600">
                {type === TransactionType.IN ? (
                  <span>
                    You are receiving{' '}
                    <strong className="text-emerald-700 font-mono text-base font-bold">
                      +{numWeight.toFixed(3)}g
                    </strong>{' '}
                    of <strong>{selectedKarat?.name}</strong> from{' '}
                    <strong>{selectedCustomer?.name}</strong>.
                  </span>
                ) : (
                  <span>
                    You are returning{' '}
                    <strong className="text-blue-700 font-mono text-base font-bold">
                      -{numWeight.toFixed(3)}g
                    </strong>{' '}
                    of completed <strong>{selectedKarat?.name}</strong> work to{' '}
                    <strong>{selectedCustomer?.name}</strong>.
                  </span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Previous</div>
                  <div className="text-sm font-bold font-mono text-slate-700">
                    {(currentBalance || 0).toFixed(3)}g
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Transaction</div>
                  <div
                    className={`text-sm font-bold font-mono ${
                      type === TransactionType.IN ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    {type === TransactionType.IN ? '+' : '-'}
                    {numWeight.toFixed(3)}g
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">New Balance</div>
                  <div
                    className={`text-sm font-bold font-mono ${
                      (newBalance || 0) < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}
                  >
                    {(newBalance || 0).toFixed(3)}g
                  </div>
                </div>
              </div>
            </div>

            {/* Negative balance warning & admin override */}
            {wouldGoNegative && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                <div className="flex items-start gap-2 text-amber-800 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Warning:</strong> Only{' '}
                    <span className="font-mono font-bold">{(currentBalance || 0).toFixed(3)}g</span> is
                    currently available in this {selectedKarat?.name} ledger.
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowOverride}
                      onChange={(e) => setAllowOverride(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    Allow adjustment override (Admin permission)
                  </label>

                  {allowOverride && (
                    <input
                      type="text"
                      placeholder="Required reason for negative override..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  )}
                </div>
              </div>
            )}

            {notes && (
              <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700">Order Name / Remark:</span> {notes}
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                disabled={isSubmitting}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 shadow-md transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isSubmitting ? 'Recording...' : 'Confirm & Save Transaction'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
