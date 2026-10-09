'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Minus,
  Scale,
  UserPlus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Clock,
  IndianRupee,
  Flame,
} from 'lucide-react';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { TransactionType } from '@prisma/client';

interface DashboardData {
  metrics: {
    todayIn: string;
    todayOut: string;
    currentPendingWork: string;
    todayMakingAmount: string;
    todayMakingGold?: string;
    todayDukanLoss?: string;
    totalDukanLoss?: string;
    todayDollLoss?: string;
    totalDollLoss?: string;
  };
  recentTransactions: Array<{
    id: string;
    transactionNumber: string;
    customerId: string;
    customerName: string;
    karatId: string;
    karatName: string;
    type: string;
    weight: string;
    notes?: string | null;
    date: string;
    status: string;
  }>;
  pendingBalances: Array<{
    customerId: string;
    customerName: string;
    shopName: string | null;
    karatId: string;
    karatName: string;
    balance: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<TransactionType>(TransactionType.IN);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDashboard = () => {
    setIsLoading(true);
    fetch('/api/dashboard')
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('Dashboard fetch warning:', errData.error || 'Failed to load');
          return null;
        }
        return res.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch((err) => {
        console.warn('Dashboard fetch error:', err.message);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDashboard();

    const handleUpdate = () => fetchDashboard();
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, []);

  const openQuickTx = (type: TransactionType) => {
    setQuickTxType(type);
    setQuickTxOpen(true);
  };

  const handleTxSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
    fetchDashboard();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Customer gold balances and cutting transactions
          </p>
        </div>

        {/* Single, clean action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openQuickTx(TransactionType.IN)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ IN</span>
          </button>

          <button
            onClick={() => openQuickTx(TransactionType.OUT)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>− OUT</span>
          </button>

          <Link
            href="/settlements"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Scale className="w-3.5 h-3.5 text-slate-500" />
            <span>Settle</span>
          </Link>

          <Link
            href="/customers/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg">
          {successMessage}
        </div>
      )}

      {/* 5 Summary Cards: Minimal & Clean */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Today's IN */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Received (IN)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {isLoading ? '...' : `${data?.metrics.todayIn || '0.000'} g`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Gold received today</p>
        </div>

        {/* Today's OUT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Returned (OUT)
            </span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {isLoading ? '...' : `${data?.metrics.todayOut || '0.000'} g`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Delivered &amp; settled return</p>
        </div>

        {/* Dukan & Doll Loss Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Dukan &amp; Doll Loss
            </span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tracking-tight flex items-baseline gap-2">
            {isLoading ? (
              '...'
            ) : (
              <>
                <span title="Dukan Loss">
                  <span className="text-xs font-sans text-orange-700 font-bold mr-1">Dk:</span>
                  {data?.metrics.todayDukanLoss || '0.000'}g
                </span>
                <span className="text-slate-300">|</span>
                <span title="Doll Loss">
                  <span className="text-xs font-sans text-rose-700 font-bold mr-1">Dl:</span>
                  {data?.metrics.todayDollLoss || '0.000'}g
                </span>
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {parseFloat(data?.metrics.totalDukanLoss || '0') > 0 || parseFloat(data?.metrics.totalDollLoss || '0') > 0
              ? `Total: Dk ${data?.metrics.totalDukanLoss || '0'}g • Dl ${data?.metrics.totalDollLoss || '0'}g`
              : 'Melting & tumbling workshop loss'}
          </p>
        </div>

        {/* Current Pending Work */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pending Work In Workshop
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {isLoading ? '...' : `${data?.metrics.currentPendingWork || '0.000'} g`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total active gold with worker</p>
        </div>

        {/* Today's Making Amount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Making Fee
            </span>
            <IndianRupee className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
            {isLoading ? (
              '...'
            ) : parseFloat(data?.metrics.todayMakingGold || '0') > 0 ? (
              <span className="text-amber-800">
                {data?.metrics.todayMakingGold} g{' '}
                <span className="text-xs font-sans text-amber-600 font-medium">(Gold)</span>
              </span>
            ) : (
              `₹${data?.metrics.todayMakingAmount || '0.00'}`
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {parseFloat(data?.metrics.todayMakingGold || '0') > 0 && parseFloat(data?.metrics.todayMakingAmount || '0') > 0
              ? `+ ₹${data?.metrics.todayMakingAmount} in cash/UPI`
              : parseFloat(data?.metrics.todayMakingGold || '0') > 0
              ? 'Deducted directly in gold fee'
              : 'Charges billed / collected in ₹'}
          </p>
        </div>
      </div>

      {/* Main Content: Pending Customer Balances + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Pending Customer Balances */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pending Customer Balances
              </h2>
              <p className="text-[11px] text-slate-400">By customer and karat</p>
            </div>
            <Link
              href="/customers"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 transition"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading balances...</div>
            ) : data?.pendingBalances && data.pendingBalances.length > 0 ? (
              data.pendingBalances.map((item, idx) => (
                <div
                  key={`${item.customerId}-${item.karatId}-${idx}`}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <Link
                      href={`/customers/${item.customerId}/karats/${item.karatId}`}
                      className="text-xs font-semibold text-slate-900 hover:underline"
                    >
                      {item.customerName}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-600 font-mono">{item.karatName}</span>
                      {item.shopName && <span>• {item.shopName}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {item.balance} g
                    </span>
                    <span className="block text-[9px] uppercase font-medium text-slate-400">
                      Pending
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                All accounts settled.
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Transactions */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recent Transactions
              </h2>
              <p className="text-[11px] text-slate-400">Latest entries in ledger</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 transition"
            >
              Full ledger <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-2">Customer</th>
                  <th className="py-2 px-2">Karat</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Weight</th>
                  <th className="py-2 px-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : data?.recentTransactions && data.recentTransactions.length > 0 ? (
                  data.recentTransactions.map((tx) => {
                    const isVoid = tx.status === 'VOID';
                    const isIn = tx.type === 'IN' || tx.type === 'OPENING_BALANCE';
                    const isOut = tx.type === 'OUT' || tx.type === 'SETTLEMENT_RETURN';
                    const isDukanLoss = tx.notes?.includes('(Dukan loss)');
                    const isDollLoss = tx.notes?.includes('(Doll loss)');
                    const isMakingGold = tx.notes?.includes('(Making charge');
                    const timeStr = new Date(tx.date).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const typeLabel = isDukanLoss
                      ? 'DUKAN LOSS'
                      : isDollLoss
                      ? 'DOLL LOSS'
                      : isMakingGold
                      ? 'MAKING (GOLD)'
                      : tx.type === 'SETTLEMENT_RETURN'
                      ? 'RETURN'
                      : tx.type;

                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50 transition ${isVoid ? 'opacity-40 line-through' : ''}`}
                      >
                        <td className="py-2.5 px-2 font-medium text-slate-800">
                          <Link
                            href={`/customers/${tx.customerId}/karats/${tx.karatId}`}
                            className="hover:underline"
                          >
                            {tx.customerName}
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 font-mono text-[11px]">
                          {tx.karatName}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              isIn
                                ? 'bg-slate-100 text-emerald-800 border border-slate-200'
                                : isDukanLoss
                                ? 'bg-orange-50 text-orange-800 border border-orange-200 font-semibold'
                                : isDollLoss
                                ? 'bg-rose-50 text-rose-800 border border-rose-200 font-semibold'
                                : isMakingGold
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : isOut
                                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                : 'bg-slate-100 text-amber-800 border border-slate-200'
                            }`}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">
                          {isIn ? '+' : '-'}
                          {tx.weight} g
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-400 text-[11px] font-mono">
                          {timeStr}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={handleTxSuccess}
        initialType={quickTxType}
      />
    </div>
  );
}
