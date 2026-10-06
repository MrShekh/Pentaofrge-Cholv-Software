'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Minus,
  Trash2,
  Calendar,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { VoidTransactionModal } from '@/components/VoidTransactionModal';
import { TransactionType } from '@prisma/client';

interface TxItem {
  id: string;
  transactionNumber: string;
  customerId: string;
  customerName: string;
  shopName: string | null;
  karatId: string;
  karatName: string;
  type: string;
  weight: string;
  transactionDate: string;
  notes: string | null;
  status: string;
  overrideAllowed: boolean;
  overrideReason: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  voidedBy: { name: string } | null;
  createdBy: { name: string };
  settlement: { id: string; settlementNumber: string } | null;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface KaratOption {
  id: string;
  name: string;
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const initialCustomer = searchParams.get('customerId') || '';

  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [karats, setKarats] = useState<KaratOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer);
  const [selectedKaratId, setSelectedKaratId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<TransactionType>(TransactionType.IN);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [txToVoid, setTxToVoid] = useState<{
    id: string;
    transactionNumber: string;
    type: string;
    weight: string;
    customerName?: string;
    karatName?: string;
  } | null>(null);

  const fetchTxns = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (selectedCustomerId) params.append('customerId', selectedCustomerId);
    if (selectedKaratId) params.append('karatId', selectedKaratId);
    if (selectedType) params.append('type', selectedType);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    fetch(`/api/transactions?${params.toString()}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.transactions) setTransactions(data.transactions);
      })
      .catch((err) => console.warn('Transactions fetch warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => d.customers && setCustomers(d.customers));

    fetch('/api/settings/karats')
      .then((r) => r.json())
      .then((d) => d.karats && setKarats(d.karats));
  }, []);

  useEffect(() => {
    fetchTxns();
  }, [selectedCustomerId, selectedKaratId, selectedType, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTxns();
  };

  const openTx = (type: TransactionType) => {
    setQuickTxType(type);
    setQuickTxOpen(true);
  };

  const handleOpenVoid = (t: TxItem) => {
    setTxToVoid({
      id: t.id,
      transactionNumber: t.transactionNumber,
      type: t.type,
      weight: t.weight,
      customerName: t.customerName,
      karatName: t.karatName,
    });
    setVoidModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-700" />
            All Ledger Transactions
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete auditable history of gold received, returned, and settled
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by customer, note, or TXN #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedKaratId}
            onChange={(e) => setSelectedKaratId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
          >
            <option value="">All Karats</option>
            {karats.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold"
          >
            <option value="">All Types</option>
            <option value="IN">IN (Received)</option>
            <option value="OUT">OUT (Finished)</option>
            <option value="SETTLEMENT_RETURN">Settlement Return</option>
            <option value="SETTLEMENT_ADJUSTMENT">Settlement Adjustment</option>
            <option value="OPENING_BALANCE">Opening Balance</option>
          </select>

          <input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />

          <input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">TXN #</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Karat</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4 text-right">Weight</th>
                <th className="py-3 px-4">Notes / Remarks</th>
                <th className="py-3 px-3">Created By</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((t) => {
                  const isVoid = t.status === 'VOID';
                  const isIn = t.type === 'IN' || t.type === 'OPENING_BALANCE';
                  const isOut = t.type === 'OUT';
                  const isSettle = t.type.startsWith('SETTLEMENT');

                  const dateObj = new Date(t.transactionDate);
                  const dateStr = dateObj.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  });
                  const timeStr = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50 transition ${
                        isVoid ? 'bg-red-50/20 text-slate-400 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {t.transactionNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{dateStr}</span>{' '}
                        <span className="text-slate-400">{timeStr}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <Link
                          href={`/customers/${t.customerId}/karats/${t.karatId}`}
                          className="hover:text-amber-700 transition"
                        >
                          {t.customerName}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {t.karatName}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isVoid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                            VOID
                          </span>
                        ) : isIn ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {t.type}
                          </span>
                        ) : isOut ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            OUT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {t.type}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                          isIn ? 'text-emerald-700' : isOut ? 'text-blue-700' : 'text-amber-800'
                        }`}
                      >
                        {isIn ? '+' : isOut ? '-' : ''}
                        {t.weight} g
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {t.notes || '—'}
                        {isVoid && t.voidReason && (
                          <span className="block text-[10px] text-red-600">
                            Reason: {t.voidReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {t.createdBy.name}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {!isVoid && (
                          <button
                            onClick={() => handleOpenVoid(t)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                            title="Void transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No transactions match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={() => fetchTxns()}
        initialType={quickTxType}
      />

      <VoidTransactionModal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        onSuccess={() => fetchTxns()}
        transaction={txToVoid}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
