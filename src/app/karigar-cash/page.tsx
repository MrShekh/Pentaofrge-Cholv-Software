'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Banknote,
  Search,
  UserPlus,
  Phone,
  ArrowRight,
  Clock,
  Trash2,
  CheckCircle2,
  X,
  User,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
} from 'lucide-react';
import ContactPickerButton from '@/components/ContactPickerButton';

interface KarigarSummary {
  id: string;
  name: string;
  phone: string;
  notes: string;
  totalPendingAdvance: string;
  totalAdvanceGiven: string;
  totalAdvanceReceived: string;
  totalSalaryPaid: string;
  entriesCount: number;
  lastTransactionDate: string | null;
}

interface OverallSummary {
  totalPendingAdvance: string;
  totalAdvanceReceived: string;
  totalSalaryPaid: string;
  totalKarigars: number;
}

function KarigarCashContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [karigars, setKarigars] = useState<KarigarSummary[]>([]);
  const [summary, setSummary] = useState<OverallSummary>({
    totalPendingAdvance: '0.00',
    totalAdvanceReceived: '0.00',
    totalSalaryPaid: '0.00',
    totalKarigars: 0,
  });
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);

  // Modal: Add Karigar
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal: Delete Karigar
  const [karigarToDelete, setKarigarToDelete] = useState<KarigarSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchKarigars = (query = '') => {
    setIsLoading(true);
    fetch(`/api/karigars?search=${encodeURIComponent(query)}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.karigars) setKarigars(data.karigars);
          if (data.summary) setSummary(data.summary);
        }
      })
      .catch((err) => console.warn('Fetch karigars warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchKarigars(searchTerm);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchKarigars(val);
  };

  const handleCreateKarigar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMessage('Karigar name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/karigars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create karigar');
      }

      setToastMessage(`Karigar "${newName}" created successfully`);
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      fetchKarigars(searchTerm);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating karigar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKarigar = async () => {
    if (!karigarToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/karigars/${karigarToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete karigar');

      setToastMessage(`Karigar "${karigarToDelete.name}" deleted`);
      setKarigarToDelete(null);
      fetchKarigars(searchTerm);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting karigar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Banknote className="w-5 h-5 text-emerald-600" />
            Karigar Cash
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Karigar accounts, cash advance folders &amp; salary calculations
          </p>
        </div>

        <button
          onClick={() => {
            setNewName('');
            setNewPhone('');
            setNewNotes('');
            setErrorMessage(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Karigar</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Advance Pending */}
        <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">
            <span>Advance Pending</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-950 font-mono">
            ₹{parseFloat(summary.totalPendingAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-700/80 mt-1">
            Receivable across all karigars
          </div>
        </div>

        {/* Advance Recovered */}
        <div className="bg-white rounded-xl border border-emerald-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5">
            <span>Advance Settled</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-950 font-mono">
            ₹{parseFloat(summary.totalAdvanceReceived).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-700/80 mt-1">
            Repaid or adjusted advances
          </div>
        </div>

        {/* Salary Paid */}
        <div className="bg-white rounded-xl border border-purple-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 uppercase tracking-wider mb-1.5">
            <span>Salary Disbursed</span>
            <Banknote className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-950 font-mono">
            ₹{parseFloat(summary.totalSalaryPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-purple-700/80 mt-1">
            Routine wages paid out
          </div>
        </div>

        {/* Total Karigars */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            <span>Total Karigars</span>
            <User className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {summary.totalKarigars}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Active karigar folders
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search karigar name or phone..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
        />
      </div>

      {/* Karigar Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading karigar accounts...</div>
      ) : karigars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {karigars.map((k) => {
            const pendingNum = parseFloat(k.totalPendingAdvance);
            const hasPending = pendingNum > 0;
            const lastTxStr = k.lastTransactionDate
              ? new Date(k.lastTransactionDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'None';

            return (
              <div
                key={k.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between space-y-3.5 hover:border-slate-300 transition"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/karigar-cash/${k.id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline flex items-center gap-1.5"
                      >
                        <span>{k.name}</span>
                      </Link>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        hasPending
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {hasPending
                        ? `₹${pendingNum.toLocaleString('en-IN')} advance pending`
                        : 'Settled (₹0)'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    {k.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {k.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">No phone</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {lastTxStr}
                    </span>
                    {parseFloat(k.totalSalaryPaid) > 0 && (
                      <span className="text-purple-700 font-medium">
                        Salary: ₹{parseFloat(k.totalSalaryPaid).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cash Ledgers summary badges */}
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                    Advance Ledger
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-1">
                      <span className="text-slate-500">Given:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        ₹{parseFloat(k.totalAdvanceGiven).toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="px-2 py-1 rounded bg-emerald-50/60 border border-emerald-200/80 text-xs flex items-center gap-1">
                      <span className="text-emerald-700">Settled:</span>
                      <span className="font-mono font-semibold text-emerald-800">
                        ₹{parseFloat(k.totalAdvanceReceived).toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      {k.entriesCount} {k.entriesCount === 1 ? 'voucher' : 'vouchers'}
                    </span>
                  </div>
                </div>

                {/* Footer link */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <Link
                    href={`/karigar-cash/${k.id}`}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-800 flex items-center gap-1 transition"
                  >
                    Open Folder <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    {k.phone && (
                      <a
                        href={`https://wa.me/${k.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium underline flex items-center gap-1 transition"
                      >
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setKarigarToDelete(k)}
                      title={`Delete ${k.name}`}
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
          <p className="text-sm font-semibold text-slate-600">No karigars found.</p>
          <button
            onClick={() => {
              setNewName('');
              setNewPhone('');
              setNewNotes('');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            <UserPlus className="w-4 h-4" /> Add Your First Karigar
          </button>
        </div>
      )}

      {/* Modal: Add Karigar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold">Add New Karigar</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKarigar} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Karigar Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sukur, Rakesh, Gopal"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Phone + Contact Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <ContactPickerButton
                    onSelect={(contact) => {
                      if (contact.phone) setNewPhone(contact.phone);
                      if (contact.name && !newName) setNewName(contact.name);
                    }}
                    label="Tablet Contacts"
                    variant="button"
                    className="text-[11px] py-1 px-2 text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded font-medium"
                  />
                </div>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Work Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Chool specialist, bench 3, daily advance account"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                >
                  {isSubmitting ? 'Creating...' : 'Save Karigar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {karigarToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Delete Karigar</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{karigarToDelete.name}</strong>? All their cash
              vouchers and records will be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKarigarToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteKarigar}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete Karigar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KarigarCashPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">Loading karigar cash...</div>}>
      <KarigarCashContent />
    </Suspense>
  );
}
