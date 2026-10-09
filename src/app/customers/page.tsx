'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  ArrowRight,
  Clock,
  Layers,
  IndianRupee,
  Trash2,
} from 'lucide-react';

interface CustomerSummary {
  id: string;
  name: string;
  shopName: string | null;
  phone: string;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  totalPendingGold: string;
  activeAccountsCount: number;
  totalOutstandingMaking: string;
  lastTransactionDate: string | null;
  accounts: Array<{
    id: string;
    karatId: string;
    karatName: string;
    balance: string;
  }>;
}

function CustomersContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);

  // Delete modal state
  const [customerToDelete, setCustomerToDelete] = useState<CustomerSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete customer');
      setCustomerToDelete(null);
      fetchCustomers(searchTerm);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting customer');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCustomers = (query = '') => {
    setIsLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(query)}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.customers) setCustomers(data.customers);
      })
      .catch((err) => console.warn('Customers fetch warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCustomers(searchTerm);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchCustomers(val);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Customers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client accounts and independent karat running balances
          </p>
        </div>

        <Link
          href="/customers/new"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search customer name or phone..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
        />
      </div>

      {/* Customer List Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading customers...</div>
      ) : customers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c) => {
            const hasPending = parseFloat(c.totalPendingGold) > 0;
            const lastTxStr = c.lastTransactionDate
              ? new Date(c.lastTransactionDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'None';

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between space-y-3.5 hover:border-slate-300 transition"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        hasPending
                          ? 'bg-slate-100 text-slate-900 border border-slate-200'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {hasPending ? `${c.totalPendingGold} g pending` : 'Settled (0g)'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {lastTxStr}
                    </span>
                    {parseFloat(c.totalOutstandingMaking) > 0 && (
                      <span className="text-slate-800 font-medium">
                        Making: ₹{c.totalOutstandingMaking}
                      </span>
                    )}
                  </div>
                </div>

                {/* Karat Accounts Badges */}
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    Karat Ledgers
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.accounts && c.accounts.length > 0 ? (
                      c.accounts.map((acc) => (
                        <Link
                          key={acc.id}
                          href={`/customers/${c.id}/karats/${acc.karatId}`}
                          className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition flex items-center gap-1.5"
                        >
                          <span className="font-semibold text-slate-800">{acc.karatName}:</span>
                          <span className="font-mono text-slate-600">
                            {acc.balance}g
                          </span>
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No active accounts</span>
                    )}
                  </div>
                </div>

                {/* Footer link */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-xs font-bold text-slate-700 hover:text-amber-800 flex items-center gap-1 transition"
                  >
                    Open File <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/customers/${c.id}/statement`}
                      className="text-xs text-slate-500 hover:text-slate-800 underline transition"
                    >
                      Statement
                    </Link>
                    <button
                      type="button"
                      onClick={() => setCustomerToDelete(c)}
                      title={`Delete ${c.name}`}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <p className="text-sm font-semibold text-slate-600">No customers found.</p>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            <UserPlus className="w-4 h-4" /> Add Your First Customer
          </Link>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
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
              Are you sure you want to delete <strong>{customerToDelete.name}</strong>?
              This will permanently remove this customer along with all their transactions, settlements, and karat ledger accounts.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-xs text-slate-400">Loading...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
