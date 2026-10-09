'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Scale,
  Plus,
  ArrowRight,
  Printer,
  CheckCircle2,
  Calendar,
  IndianRupee,
  FileCheck,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { SettlementAction, ChargeBasis } from '@prisma/client';

interface SettlementItem {
  id: string;
  settlementNumber: string;
  customerId: string;
  customerName: string;
  shopName: string | null;
  karatId: string;
  karatName: string;
  fromDate: string;
  toDate: string;
  settlementDate: string;
  totalInWeight: string;
  totalOutWeight: string;
  remainingBefore: string;
  settlementAction: string;
  settledWeight: string;
  returnedGoldWeight?: string;
  dukanLossWeight?: string;
  dollLossWeight?: string;
  carryForwardWeight: string;
  makingRate: string;
  chargeBasis: string;
  chargeableWeight: string;
  finalMakingAmount: string;
  paymentStatus: string;
  paidAmount: string;
  pendingAmount: string;
  notes: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
  shopName: string | null;
}

interface KaratOption {
  id: string;
  name: string;
  defaultMakingRate: string;
}

function SettlementsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const preCustomerId = searchParams.get('customerId') || '';
  const preKaratId = searchParams.get('karatId') || '';

  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [karats, setKarats] = useState<KaratOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New settlement form state
  const [showNewModal, setShowNewModal] = useState(Boolean(preCustomerId));
  const [selectedCustomerId, setSelectedCustomerId] = useState(preCustomerId);
  const [selectedKaratId, setSelectedKaratId] = useState(preKaratId);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetched account stats for the period
  const [accountSummary, setAccountSummary] = useState<{
    totalIn: number;
    totalOut: number;
    remaining: number;
  } | null>(null);

  // Workshop Settlement State (Gold / Metal only)
  const [makingGoldWeight, setMakingGoldWeight] = useState<string>('');
  const [returnGoldWeight, setReturnGoldWeight] = useState<string>('');
  const [dukanLossWeight, setDukanLossWeight] = useState<string>('');
  const [dollLossWeight, setDollLossWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Making Rate Calculation State:
  const [orderWeight, setOrderWeight] = useState<string>('');
  const [rateUnit, setRateUnit] = useState<'PER_100G' | 'PER_GRAM'>('PER_100G');
  const [makingRate, setMakingRate] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const recalculateMaking = (
    owStr: string,
    rateStr: string,
    unit: 'PER_100G' | 'PER_GRAM'
  ) => {
    const ow = parseFloat(owStr) || 0;
    const rate = parseFloat(rateStr) || 0;

    let calcGold = 0;
    if (unit === 'PER_100G') {
      calcGold = (ow * rate) / 100;
    } else {
      calcGold = ow * rate;
    }

    if (rateStr !== '') {
      const calcGoldStr = calcGold > 0 ? calcGold.toFixed(3) : '';
      setMakingGoldWeight(calcGoldStr);
    }
  };

  // Notebook manual entry: Independent fields, no forced auto-calculations
  const handleReturnGoldChange = (val: string) => {
    setReturnGoldWeight(val);
  };

  const handleDukanLossChange = (val: string) => {
    setDukanLossWeight(val);
  };

  const handleDollLossChange = (val: string) => {
    setDollLossWeight(val);
  };

  const handleOrderWeightChange = (val: string) => {
    setOrderWeight(val);
    recalculateMaking(val, makingRate, rateUnit);
  };

  const handleRateChange = (val: string) => {
    setMakingRate(val);
    recalculateMaking(orderWeight, val, rateUnit);
  };

  const handleRateUnitChange = (unit: 'PER_100G' | 'PER_GRAM') => {
    setRateUnit(unit);
    recalculateMaking(orderWeight, makingRate, unit);
  };

  const fetchSettlements = () => {
    setIsLoading(true);
    fetch('/api/settlements')
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.settlements) setSettlements(data.settlements);
      })
      .catch((err) => console.warn('Settlements fetch warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchSettlements();

    fetch('/api/customers')
      .then((res) => res.json())
      .then((d) => {
        if (d.customers) setCustomers(d.customers);
      });

    fetch('/api/settings/karats')
      .then((res) => res.json())
      .then((d) => {
        if (d.karats) {
          setKarats(d.karats);
          if (!selectedKaratId && d.karats.length > 0) {
            setSelectedKaratId(d.karats[0].id);
          }
        }
      });
  }, []);

  // Fetch ledger summary for selected customer & karat
  useEffect(() => {
    if (selectedCustomerId && selectedKaratId) {
      fetch(`/api/customers/${selectedCustomerId}/karats/${selectedKaratId}`)
        .then((res) => res.json())
        .then((d) => {
          if (d.summary) {
            const totIn = parseFloat(d.summary.totalIn);
            const totOut = parseFloat(d.summary.totalOut);
            const bal = parseFloat(d.summary.currentBalance);
            const summaryObj = {
              totalIn: totIn,
              totalOut: totOut,
              remaining: bal,
            };
            setAccountSummary(summaryObj);
            setReturnGoldWeight('');
            setMakingGoldWeight('');
            setDukanLossWeight('');
            setDollLossWeight('');
            setOrderWeight('');
          }
        })
        .catch(console.error);
    } else {
      setAccountSummary(null);
    }
  }, [selectedCustomerId, selectedKaratId]);

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedKaratId) {
      setErrorMessage('Please select a customer and karat');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const ow = parseFloat(orderWeight) || 0;
      const r = parseFloat(makingRate) || 0;
      const dl = parseFloat(dukanLossWeight) || 0;
      const doll = parseFloat(dollLossWeight) || 0;

      const rateParts: string[] = [];
      if (r > 0) {
        rateParts.push(
          `Making: ${parseFloat(makingGoldWeight || '0').toFixed(3)}g gold (${makingRate}${rateUnit === 'PER_100G' ? '/100g' : '/g'} on ${ow.toFixed(3)}g order)`
        );
      }
      if (dl > 0) {
        rateParts.push(`Dukan Loss: ${dl.toFixed(3)}g`);
      }
      if (doll > 0) {
        rateParts.push(`Doll Loss: ${doll.toFixed(3)}g`);
      }

      const rateInfo = rateParts.join(' • ');
      const finalNotes = notes?.trim()
        ? (rateInfo ? `${notes.trim()} • ${rateInfo}` : notes.trim())
        : (rateInfo || null);

      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          karatId: selectedKaratId,
          settleMode: 'GOLD',
          makingGoldWeight: parseFloat(makingGoldWeight || '0'),
          returnGoldWeight: parseFloat(returnGoldWeight || '0'),
          dukanLossWeight: dl,
          dollLossWeight: doll,
          makingAmountMoney: 0,
          paymentReceived: 0,
          paymentMode: 'CASH',
          makingRate: r > 0 ? r : undefined,
          notes: finalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute settlement');
      }

      setSuccessToast(data.message || 'Settlement completed');
      setShowNewModal(false);
      fetchSettlements();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transaction-updated'));
      }

      // Open receipt page
      router.push(`/settlements/${data.settlement.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error executing settlement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-amber-700" />
            Settlements & Making Charges
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Account period settlements, remaining gold returns/adjustments, and charge bills
          </p>
        </div>

        <button
          onClick={() => {
            setMakingGoldWeight('');
            setReturnGoldWeight('');
            setDukanLossWeight('');
            setDollLossWeight('');
            setOrderWeight('');
            setMakingRate('');
            setNotes('');
            setShowNewModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Settle an Account</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Settlement History List (Section 12) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Settlement History</h2>
          <span className="text-xs text-slate-400 font-mono">
            {settlements.length} settlements on record
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Settlement #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Karat</th>
                <th className="py-3 px-3 text-right">Total IN</th>
                <th className="py-3 px-3 text-right">Finished OUT</th>
                <th className="py-3 px-3 text-right">Gold Returned</th>
                <th className="py-3 px-3 text-right">Dukan Loss</th>
                <th className="py-3 px-3 text-right">Doll Loss</th>
                <th className="py-3 px-3 text-right">Making Charge</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Loading settlement history...
                  </td>
                </tr>
              ) : settlements.length > 0 ? (
                settlements.map((s) => {
                  const dateStr = new Date(s.settlementDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  const isSettledInGold =
                    parseFloat(s.finalMakingAmount) === 0 && parseFloat(s.chargeableWeight) > 0;
                  const dukanLossVal = parseFloat(s.dukanLossWeight || '0');
                  const dollLossVal = parseFloat(s.dollLossWeight || '0');
                  const makingGoldVal = isSettledInGold ? parseFloat(s.chargeableWeight || '0') : 0;
                  const actualReturnedGold = s.returnedGoldWeight
                    ? s.returnedGoldWeight
                    : Math.max(0, parseFloat(s.settledWeight) - makingGoldVal - dukanLossVal - dollLossVal).toFixed(3);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <Link
                          href={`/settlements/${s.id}`}
                          className="hover:text-amber-700 underline transition"
                        >
                          {s.settlementNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <Link
                          href={`/customers/${s.customerId}`}
                          className="hover:text-amber-700 transition"
                        >
                          {s.customerName}
                        </Link>
                        {s.shopName && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {s.shopName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {s.karatName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700">
                        {s.totalInWeight}g
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-blue-700">
                        {s.totalOutWeight}g
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {actualReturnedGold}g
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {dukanLossVal > 0 ? (
                          <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-[11px]">
                            {s.dukanLossWeight}g
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {dollLossVal > 0 ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                            {s.dollLossWeight}g
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isSettledInGold ? (
                          <div>
                            <span className="text-amber-900">{s.chargeableWeight}g</span>
                            {parseFloat(s.makingRate) > 0 ? (
                              <span className="block text-[10px] font-semibold text-amber-700">
                                @{s.makingRate}/100g
                              </span>
                            ) : (
                              <span className="block text-[9px] font-bold text-amber-700">
                                🪙 In Gold
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-900">₹{s.finalMakingAmount}</span>
                            {parseFloat(s.makingRate) > 0 ? (
                              <span className="block text-[10px] font-normal text-slate-500">
                                @₹{s.makingRate}/g
                              </span>
                            ) : (
                              <span className="block text-[9px] font-normal text-slate-400">
                                In Rupees
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isSettledInGold ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                            🪙 SETTLED IN GOLD
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {s.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/settlements/${s.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 hover:text-slate-900 text-[11px] font-bold transition shadow-2xs"
                        >
                          <Printer className="w-3 h-3 text-slate-400" />
                          <span>Receipt</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No settlements recorded yet. Click &quot;Settle an Account&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Account Interactive Modal / Form (Section 11) */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-2 text-amber-900">
                <Scale className="w-5 h-5 text-amber-700" />
                <div>
                  <h2 className="text-base font-black">Settle Customer Karat Account</h2>
                  <p className="text-xs text-amber-700">Calculate remaining gold & making charges</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitSettlement} className="p-6 space-y-6">
              {/* Account Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Customer *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.shopName ? `(${c.shopName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Karat Ledger *
                  </label>
                  <select
                    value={selectedKaratId}
                    onChange={(e) => setSelectedKaratId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    {karats.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Period From
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Period To (Cutoff)
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white"
                  />
                </div>
              </div>

              {/* Current Period Gold Summary Cards */}
              {accountSummary && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Workshop Ledger Summary
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Received (IN)</div>
                      <div className="text-base font-black font-mono text-emerald-700">
                        {accountSummary.totalIn.toFixed(3)}g
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Finished Returned (OUT)</div>
                      <div className="text-base font-black font-mono text-blue-700">
                        {accountSummary.totalOut.toFixed(3)}g
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="text-[10px] uppercase font-bold text-amber-800">Loss / Difference</div>
                      <div className="text-base font-black font-mono text-amber-950">
                        {accountSummary.remaining.toFixed(3)}g
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gold Settlement Details */}
              <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-4">
                  {/* Rate Calculation Header & Inputs */}
                  <div className="space-y-3 pb-3 border-b border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-amber-700" /> Calculate Making Charge by Rate
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Enter rate per 100g or per gram on the order weight
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Order Weight */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Order Weight</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={orderWeight}
                            onChange={(e) => handleOrderWeightChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">g</span>
                        </div>
                      </div>

                      {/* Making Rate & Unit Toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">Making Charge Rate</label>
                          {/* Unit Toggle */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleRateUnitChange('PER_100G')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                                rateUnit === 'PER_100G'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              / 100g
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRateUnitChange('PER_GRAM')}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                                rateUnit === 'PER_GRAM'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              / 1g
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={makingRate}
                            onChange={(e) => handleRateChange(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                            {rateUnit === 'PER_100G' ? 'g / 100g' : 'g / g'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Live Calculation Formula Display */}
                    {parseFloat(orderWeight) > 0 && parseFloat(makingRate) > 0 && (
                      <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                          <span className="text-amber-800">🧮 Formula:</span>
                          {rateUnit === 'PER_100G' ? (
                            <span>
                              {parseFloat(orderWeight).toFixed(3)}g (Order) × {makingRate} ÷ 100 ={' '}
                              <strong className="text-amber-900 font-mono text-sm underline">
                                {parseFloat(makingGoldWeight || '0').toFixed(3)}g
                              </strong>{' '}
                              Gold Making Charge
                            </span>
                          ) : (
                            <span>
                              {parseFloat(orderWeight).toFixed(3)}g (Order) × {makingRate} ={' '}
                              <strong className="text-amber-900 font-mono text-sm underline">
                                {parseFloat(makingGoldWeight || '0').toFixed(3)}g
                              </strong>{' '}
                              Gold Making Charge
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-amber-800 bg-white/90 px-2 py-0.5 rounded-full border border-amber-200 w-fit">
                          Auto-calculated
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gold Grams: Making, Return, Dukan Loss, and Doll Loss (Manual Notebook entries) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Making Charge (Gold) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={makingGoldWeight}
                          onChange={(e) => setMakingGoldWeight(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">g</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Return to Customer *</label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={returnGoldWeight}
                          onChange={(e) => handleReturnGoldChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">g</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-red-700 flex items-center gap-1">
                          <span>🔥</span> Dukan Loss
                        </label>
                        {parseFloat(dukanLossWeight || '0') > 0 && (
                          <button
                            type="button"
                            onClick={() => handleDukanLossChange('')}
                            className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                            title="Clear Dukan Loss"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={dukanLossWeight}
                          onChange={(e) => handleDukanLossChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-red-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-red-400 font-bold">g</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-rose-700 flex items-center gap-1">
                          <span>✨</span> Doll Loss
                        </label>
                        {parseFloat(dollLossWeight || '0') > 0 && (
                          <button
                            type="button"
                            onClick={() => handleDollLossChange('')}
                            className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                            title="Clear Doll Loss"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={dollLossWeight}
                          onChange={(e) => handleDollLossChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-rose-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-rose-400 font-bold">g</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Total: <strong className="font-mono">{accountSummary?.remaining.toFixed(3) || '0.000'}g</strong></span>
                      <span>{' − '}Making: <strong className="font-mono text-amber-800">{parseFloat(makingGoldWeight || '0').toFixed(3)}g</strong></span>
                      {parseFloat(dukanLossWeight || '0') > 0 && (
                        <span>{' − '}Dukan: <strong className="font-mono text-red-700">{parseFloat(dukanLossWeight || '0').toFixed(3)}g</strong></span>
                      )}
                      {parseFloat(dollLossWeight || '0') > 0 && (
                        <span>{' − '}Doll: <strong className="font-mono text-rose-700">{parseFloat(dollLossWeight || '0').toFixed(3)}g</strong></span>
                      )}
                      <span>{' = '}Return: <strong className="font-mono text-emerald-700">{parseFloat(returnGoldWeight || '0').toFixed(3)}g</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Ledger Closing:{' '}
                      <strong className="font-mono text-slate-900">
                        {Math.max(
                          0,
                          (accountSummary?.remaining || 0) -
                            parseFloat(makingGoldWeight || '0') -
                            parseFloat(returnGoldWeight || '0') -
                            parseFloat(dukanLossWeight || '0') -
                            parseFloat(dollLossWeight || '0')
                        ).toFixed(3)}g
                      </strong>
                    </div>
                  </div>
                </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Settlement Notes / Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  {isSubmitting ? 'Settling...' : 'Confirm & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettlementsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading settlements...</div>}>
      <SettlementsContent />
    </Suspense>
  );
}
