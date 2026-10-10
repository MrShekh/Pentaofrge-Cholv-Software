'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  MapPin,
  FileText,
  Plus,
  Minus,
  Scale,
  ArrowRight,
  Clock,
  Layers,
  IndianRupee,
  CheckCircle,
  Trash2,
  Pencil,
} from 'lucide-react';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { EditSettlementModal, SettlementEditData } from '@/components/EditSettlementModal';
import { TransactionType } from '@prisma/client';

interface KaratAccountData {
  accountId: string;
  karatId: string;
  karatName: string;
  karatValue: string;
  defaultMakingRate: string;
  totalIn: string;
  totalOut: string;
  totalAdjusted: string;
  balance: string;
  lastTransactionDate: string | null;
  transactionCount: number;
}

interface SettlementItem {
  id: string;
  settlementNumber: string;
  settlementDate: string;
  karatName: string;
  karatId: string;
  totalInWeight: string;
  totalOutWeight: string;
  settledWeight: string;
  returnedGoldWeight: string;
  makingGoldWeight: string;
  dukanLossWeight: string;
  dollLossWeight: string;
  finalMakingAmount: string;
  paidAmount: string;
  pendingAmount: string;
  paymentStatus: string;
}

interface CustomerData {
  customer: {
    id: string;
    name: string;
    shopName: string | null;
    phone: string;
    whatsapp: string | null;
    address: string | null;
    gstNumber: string | null;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
  };
  karatAccounts: KaratAccountData[];
  settlements?: SettlementItem[];
  summary: {
    totalActiveKaratAccounts: number;
    totalPendingGold: string;
    totalOutstandingMaking: string;
    settlementCount: number;
  };
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quick transaction modal states
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<TransactionType>(TransactionType.IN);
  const [targetKaratId, setTargetKaratId] = useState<string | undefined>(undefined);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Edit Settlement Modal states
  const [editSettlementModalOpen, setEditSettlementModalOpen] = useState(false);
  const [settlementToEdit, setSettlementToEdit] = useState<SettlementEditData | null>(null);

  const handleOpenEditSettlement = (s: SettlementItem) => {
    setSettlementToEdit({
      id: s.id,
      settlementNumber: s.settlementNumber,
      customerName: data?.customer?.name,
      karatName: s.karatName,
      totalInWeight: s.totalInWeight,
      dukanLossWeight: s.dukanLossWeight,
      dollLossWeight: s.dollLossWeight,
      makingGoldWeight: s.makingGoldWeight,
      returnedGoldWeight: s.returnedGoldWeight,
    });
    setEditSettlementModalOpen(true);
  };

  // Delete customer modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCustomer = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete customer');
      router.push('/customers');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting customer');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const fetchCustomer = () => {
    setIsLoading(true);
    fetch(`/api/customers/${id}`)
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
      .catch((err) => console.warn('Customer fetch warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCustomer();

    const handleUpdate = () => fetchCustomer();
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [id]);

  const openTx = (type: TransactionType, karatId?: string) => {
    setQuickTxType(type);
    setTargetKaratId(karatId);
    setQuickTxOpen(true);
  };

  const handleTxSuccess = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
    fetchCustomer();
  };

  if (isLoading && !data) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading customer file...</div>;
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-600">
        <p className="font-bold">Customer not found</p>
        <Link href="/customers" className="text-xs text-amber-700 underline mt-2 inline-block">
          Back to Customers
        </Link>
      </div>
    );
  }

  const { customer, karatAccounts, summary } = data;

  return (
    <div className="space-y-6">
      {/* Navigation and Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
        </Link>

        <Link
          href={`/customers/${id}/statement`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Complete Statement</span>
        </Link>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Customer Header (Section 31 UX) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {customer.name}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openTx(TransactionType.IN, karatAccounts?.[0]?.karatId)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ IN</span>
          </button>
          <button
            onClick={() => openTx(TransactionType.OUT, karatAccounts?.[0]?.karatId)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>− OUT</span>
          </button>
          <Link
            href={`/settlements?customerId=${customer.id}`}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Scale className="w-4 h-4" />
            <span>Settle</span>
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            title="Delete Customer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition ml-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" /> Active Karat Accounts
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {summary.totalActiveKaratAccounts}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Total Gold Pending
          </span>
          <div className="text-2xl font-black text-amber-900 mt-1 font-mono">
            {summary.totalPendingGold} g
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> Outstanding Making
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            ₹{summary.totalOutstandingMaking}
          </div>
        </div>
      </div>

      {/* Karat Accounts List (Section 4 & Section 31 UX) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Karat Ledgers (Strict Separation)
          </h2>
          <span className="text-xs text-slate-500">Each karat operates independently</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {karatAccounts.map((acc) => {
            const hasPending = parseFloat(acc.balance) > 0;
            return (
              <div
                key={acc.accountId}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-sm font-black rounded-lg">
                      {acc.karatName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Rate: ₹{acc.defaultMakingRate}/g
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                      Current Running Balance
                    </span>
                    <div
                      className={`text-3xl font-black font-mono tracking-tight ${
                        hasPending ? 'text-amber-900' : 'text-slate-800'
                      }`}
                    >
                      {acc.balance} g
                    </div>
                  </div>

                  {/* IN / OUT / Adjusted sub-stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Received</div>
                      <div className="font-mono font-bold text-emerald-700 mt-0.5">{acc.totalIn}g</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Returned</div>
                      <div className="font-mono font-bold text-blue-700 mt-0.5">{acc.totalOut}g</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Adjusted</div>
                      <div className="font-mono font-bold text-amber-800 mt-0.5">{acc.totalAdjusted}g</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openTx(TransactionType.IN, acc.karatId)}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-lg transition"
                    >
                      + IN
                    </button>
                    <button
                      onClick={() => openTx(TransactionType.OUT, acc.karatId)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg transition"
                    >
                      − OUT
                    </button>
                  </div>

                  <Link
                    href={`/customers/${customer.id}/karats/${acc.karatId}`}
                    className="text-xs font-bold text-slate-800 hover:text-amber-700 flex items-center gap-1 transition"
                  >
                    View Bank-Style Ledger <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed / Settled Orders Section (Distinct Carts for Settled Orders) */}
      {data.settlements && data.settlements.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Completed Orders / Settled History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past closed order cycles with return and loss breakdowns
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {data.settlements.length} order{data.settlements.length === 1 ? '' : 's'} settled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.settlements.map((s) => (
              <div
                key={s.id}
                className="bg-slate-50/60 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5 hover:bg-white hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {s.settlementNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        SETTLED
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                        {s.karatName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Settled Date:{' '}
                      {new Date(s.settlementDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditSettlement(s)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3 text-amber-700" />
                      <span>Edit</span>
                    </button>
                    <Link
                      href={`/settlements/${s.id}`}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      View Receipt
                    </Link>
                  </div>
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-200/80 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Order In</div>
                    <div className="font-mono font-bold text-emerald-700 mt-0.5">
                      {s.totalInWeight}g
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Returned</div>
                    <div className="font-mono font-bold text-blue-700 mt-0.5">
                      {s.returnedGoldWeight}g
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Making</div>
                    <div className="font-mono font-bold text-slate-700 mt-0.5">
                      {s.makingGoldWeight}g
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Dukan Loss</div>
                    <div className="font-mono font-bold text-amber-800 mt-0.5">
                      {s.dukanLossWeight}g
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                    <div className="text-[9px] text-slate-400 font-bold uppercase">Doll Loss</div>
                    <div className="font-mono font-bold text-purple-700 mt-0.5">
                      {s.dollLossWeight}g
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={handleTxSuccess}
        initialType={quickTxType}
        initialCustomerId={customer.id}
        initialKaratId={targetKaratId}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Customer</h3>
                <p className="text-xs text-slate-500">Permanent removal from ledger</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong>{customer.name}</strong>?
              This will permanently delete this customer along with all their transactions, settlements, and karat accounts.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Settlement Modal */}
      <EditSettlementModal
        isOpen={editSettlementModalOpen}
        onClose={() => {
          setEditSettlementModalOpen(false);
          setSettlementToEdit(null);
        }}
        settlement={settlementToEdit}
        onSuccess={() => {
          setFeedbackMessage('Settlement updated successfully! Balance recalculated.');
          setTimeout(() => setFeedbackMessage(null), 4000);
          fetchCustomer();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('transaction-updated'));
          }
        }}
      />
    </div>
  );
}
