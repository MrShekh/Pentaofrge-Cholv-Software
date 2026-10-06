'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

interface StatementItem {
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
  createdBy: { name: string };
}

interface StatementData {
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
  };
  summary: {
    totalIn: string;
    totalOut: string;
    totalAdjusted: string;
    currentBalance: string;
    totalTransactions: number;
  };
  ledger: StatementItem[];
}

export default function CustomerStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [karats, setKarats] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedKaratId, setSelectedKaratId] = useState<string>('');
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/business')
      .then((r) => r.json())
      .then((d) => setBusiness(d.business));

    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomerInfo(d.customer);
        if (d.karatAccounts && d.karatAccounts.length > 0) {
          setKarats(d.karatAccounts.map((k: any) => ({ id: k.karatId, name: k.karatName })));
          setSelectedKaratId(d.karatAccounts[0].karatId);
        }
      });
  }, [id]);

  useEffect(() => {
    if (id && selectedKaratId) {
      setIsLoading(true);
      fetch(`/api/customers/${id}/karats/${selectedKaratId}`)
        .then((r) => r.json())
        .then((d) => setStatementData(d))
        .finally(() => setIsLoading(false));
    }
  }, [id, selectedKaratId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Bar (hidden in print) */}
      <div className="flex items-center justify-between no-print gap-4">
        <Link
          href={`/customers/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customer File
        </Link>

        <div className="flex items-center gap-3">
          {karats.length > 1 && (
            <select
              value={selectedKaratId}
              onChange={(e) => setSelectedKaratId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs"
            >
              {karats.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} Ledger
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Statement Document (Section 17) */}
      <div className="print-page bg-white rounded-2xl border border-slate-200 shadow-md p-8 md:p-12 text-slate-900 font-sans space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 pb-6 border-b border-slate-200">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            {business?.name || 'Penta Chool Works'}
          </h2>
          <p className="text-xs text-slate-600">{business?.address}</p>
          <p className="text-xs text-slate-500">Phone: {business?.phone}</p>
        </div>

        {/* Title & Customer Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              Customer Gold Statement
            </h3>
            <div className="text-sm font-bold text-slate-800 mt-1">{customerInfo?.name}</div>
            {customerInfo?.shopName && (
              <div className="text-xs text-slate-500">{customerInfo.shopName}</div>
            )}
            <div className="text-xs text-slate-500">{customerInfo?.phone}</div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-amber-100 border border-amber-300 text-amber-950 font-black text-xs rounded-lg">
              {statementData?.karat.name} ACCOUNT
            </span>
            <div className="text-xs text-slate-400">
              Date: {new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-2">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">IN (g)</th>
                <th className="py-2.5 px-3 text-right">OUT (g)</th>
                <th className="py-2.5 px-3 text-right">Adjustment (g)</th>
                <th className="py-2.5 px-4 text-right font-black text-slate-900">
                  Balance (g)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {statementData?.ledger && statementData.ledger.length > 0 ? (
                // Statements are printed chronologically (oldest to newest)
                [...statementData.ledger].reverse().map((t) => {
                  const isVoid = t.status === 'VOID';
                  const dateStr = new Date(t.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={t.id}
                      className={isVoid ? 'opacity-30 line-through bg-slate-50' : ''}
                    >
                      <td className="py-2 px-3 font-mono whitespace-nowrap">{dateStr}</td>
                      <td className="py-2 px-2 font-bold text-[10px]">{t.type}</td>
                      <td className="py-2 px-3 max-w-xs truncate">{t.notes || '—'}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">
                        {t.inWeight || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-blue-800">
                        {t.outWeight || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-800">
                        {t.adjWeight || '—'}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        {t.runningBalance !== null ? `${t.runningBalance} g` : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions found for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Statement Summary Card (Section 17) */}
        {statementData?.summary && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Total IN</span>
              <div className="text-base font-black font-mono text-emerald-700 mt-0.5">
                {statementData.summary.totalIn} g
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Total OUT</span>
              <div className="text-base font-black font-mono text-blue-700 mt-0.5">
                {statementData.summary.totalOut} g
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Settled / Adjusted
              </span>
              <div className="text-base font-black font-mono text-amber-800 mt-0.5">
                {statementData.summary.totalAdjusted} g
              </div>
            </div>
            <div className="bg-amber-100/60 p-2 rounded-lg border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-900">Closing Balance</span>
              <div className="text-lg font-black font-mono text-amber-950 mt-0.5">
                {statementData.summary.currentBalance} g
              </div>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="w-48 mx-auto border-t border-slate-400 pt-2 font-bold text-slate-800">
              Customer Acknowledgement
            </div>
          </div>
          <div>
            <div className="w-48 mx-auto border-t border-slate-400 pt-2 font-bold text-slate-800">
              Authorized Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
