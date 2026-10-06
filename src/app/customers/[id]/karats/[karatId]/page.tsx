'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Minus,
  Scale,
  Printer,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { VoidTransactionModal } from '@/components/VoidTransactionModal';
import { TransactionType } from '@prisma/client';

interface LedgerItem {
  id: string;
  transactionNumber: string;
  date: string;
  type: string;
  status: string;
  weight: string;
  inWeight: string | null;
  outWeight: string | null;
  adjWeight: string | null;
  runningBalance: string | null;
  notes: string | null;
  description: string | null;
  overrideAllowed: boolean;
  overrideReason: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  voidedBy: { name: string; username: string } | null;
  createdBy: { id: string; name: string; username: string };
  settlement: {
    id: string;
    settlementNumber: string;
  } | null;
}

interface LedgerResponse {
  customer: {
    id: string;
    name: string;
    shopName: string | null;
    phone: string;
    address: string | null;
  };
  karat: {
    id: string;
    name: string;
    value: string;
    defaultMakingRate: string;
  };
  summary: {
    totalIn: string;
    totalOut: string;
    totalAdjusted: string;
    currentBalance: string;
    totalTransactions: number;
  };
  ledger: LedgerItem[];
}

export default function CustomerKaratLedgerPage({
  params,
}: {
  params: Promise<{ id: string; karatId: string }>;
}) {
  const { id: customerId, karatId } = use(params);

  const [data, setData] = useState<LedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick transaction modal
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<TransactionType>(TransactionType.IN);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Void modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [txToVoid, setTxToVoid] = useState<{
    id: string;
    transactionNumber: string;
    type: string;
    weight: string;
    customerName?: string;
    karatName?: string;
  } | null>(null);

  const fetchLedger = () => {
    setIsLoading(true);
    fetch(`/api/customers/${customerId}/karats/${karatId}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch((err) => console.warn('Ledger fetch warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLedger();

    const handleUpdate = () => fetchLedger();
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [customerId, karatId]);

  const openTx = (type: TransactionType) => {
    setQuickTxType(type);
    setQuickTxOpen(true);
  };

  const handleTxSuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
    fetchLedger();
  };

  const handleOpenVoid = (t: LedgerItem) => {
    setTxToVoid({
      id: t.id,
      transactionNumber: t.transactionNumber,
      type: t.type,
      weight: t.weight,
      customerName: data?.customer.name,
      karatName: data?.karat.name,
    });
    setVoidModalOpen(true);
  };

  if (isLoading && !data) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading ledger statement...</div>;
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-600">
        <p className="font-bold">Ledger account not found</p>
        <Link href={`/customers/${customerId}`} className="text-xs text-amber-700 underline mt-2">
          Back to Customer
        </Link>
      </div>
    );
  }

  const { customer, karat, summary, ledger } = data;

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href={`/customers/${customerId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {customer.name}
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openTx(TransactionType.IN)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ IN</span>
          </button>
          <button
            onClick={() => openTx(TransactionType.OUT)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>− OUT</span>
          </button>
          <Link
            href={`/settlements?customerId=${customer.id}&karatId=${karat.id}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Scale className="w-4 h-4" />
            <span>Settle Account</span>
          </Link>
          <Link
            href={`/customers/${customer.id}/statement?karatId=${karat.id}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Statement</span>
          </Link>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Account Info & Running Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-sm rounded-lg">
                {karat.name} LEDGER
              </span>
              <span className="text-xs text-slate-400">({karat.value}% Purity)</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phone: {customer.phone} {customer.shopName ? `• ${customer.shopName}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total IN
              </div>
              <div className="text-lg font-mono font-bold text-emerald-700">
                {summary.totalIn} g
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total OUT
              </div>
              <div className="text-lg font-mono font-bold text-blue-700">
                {summary.totalOut} g
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Adjusted
              </div>
              <div className="text-lg font-mono font-bold text-amber-800">
                {summary.totalAdjusted} g
              </div>
            </div>
            <div className="pl-2 border-l border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Current Balance
              </div>
              <div className="text-2xl font-mono font-black text-amber-950">
                {summary.currentBalance} g
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Statement Style Ledger (Section 8) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Statement of Account (Running Ledger)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {summary.totalTransactions} transactions recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Description / Notes</th>
                <th className="py-3 px-3 text-right">IN (g)</th>
                <th className="py-3 px-3 text-right">OUT (g)</th>
                <th className="py-3 px-3 text-right">Adjustment (g)</th>
                <th className="py-3 px-4 text-right font-black text-slate-700">
                  Running Balance (g)
                </th>
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ledger.map((t) => {
                const isVoid = t.status === 'VOID';
                const dateObj = new Date(t.date);
                const dateFormatted = dateObj.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr
                    key={t.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isVoid ? 'bg-red-50/20 text-slate-400' : ''
                    }`}
                  >
                    {/* Date & Time */}
                    <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{dateFormatted}</div>
                      <div className="text-slate-400 text-[10px]">{timeFormatted}</div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {isVoid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 line-through">
                          VOID ({t.type})
                        </span>
                      ) : t.type === 'IN' || t.type === 'OPENING_BALANCE' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {t.type === 'OPENING_BALANCE' ? 'OPENING' : 'IN'}
                        </span>
                      ) : t.type === 'OUT' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          OUT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {t.type === 'SETTLEMENT_RETURN' ? 'SETTLE RETURN' : 'SETTLE ADJ'}
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-700 font-semibold truncate">
                        {t.notes || t.description || '—'}
                      </div>
                      {t.transactionNumber && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {t.transactionNumber}
                        </span>
                      )}
                      {isVoid && t.voidReason && (
                        <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                          Void Reason: {t.voidReason}
                        </div>
                      )}
                      {t.overrideAllowed && (
                        <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                          Override: {t.overrideReason}
                        </div>
                      )}
                    </td>

                    {/* IN */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {isVoid ? (
                        <span className="line-through">{t.inWeight || '—'}</span>
                      ) : (
                        t.inWeight || '—'
                      )}
                    </td>

                    {/* OUT */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                      {isVoid ? (
                        <span className="line-through">{t.outWeight || '—'}</span>
                      ) : (
                        t.outWeight || '—'
                      )}
                    </td>

                    {/* Adjustment */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-800">
                      {isVoid ? (
                        <span className="line-through">{t.adjWeight || '—'}</span>
                      ) : (
                        t.adjWeight || '—'
                      )}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                      {isVoid ? <span className="text-slate-300 font-normal">—</span> : `${t.runningBalance} g`}
                    </td>

                    {/* User */}
                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {t.createdBy.name}
                    </td>

                    {/* Action (Void) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {!isVoid && (
                        <button
                          onClick={() => handleOpenVoid(t)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                          title="Void transaction (with reason)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={handleTxSuccess}
        initialType={quickTxType}
        initialCustomerId={customer.id}
        initialKaratId={karat.id}
      />

      <VoidTransactionModal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        onSuccess={handleTxSuccess}
        transaction={txToVoid}
      />
    </div>
  );
}
