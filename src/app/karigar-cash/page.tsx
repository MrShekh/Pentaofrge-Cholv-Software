'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Share2,
  Copy,
  Check,
  AlertCircle,
  X,
  Phone,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
} from 'lucide-react';
import ContactPickerButton from '@/components/ContactPickerButton';

interface KarigarCashEntry {
  id: string;
  entryNumber: string;
  karigarName: string;
  phone: string;
  category: 'ADVANCE' | 'SALARY' | 'OTHER';
  amount: string;
  date: string;
  status: 'GIVEN' | 'RECEIVED';
  settledAt: string | null;
  notes: string;
  createdAt: string;
}

interface BusinessProfile {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
}

export default function KarigarCashPage() {
  const [entries, setEntries] = useState<KarigarCashEntry[]>([]);
  const [business, setBusiness] = useState<BusinessProfile>({
    name: 'Penta Chool Works',
    ownerName: 'Kishorebhai Soni',
    phone: '+91 98765 43210',
    address: 'Shop No. 12, Gold Market, Soni Bazaar, Rajkot, Gujarat',
  });
  const [summary, setSummary] = useState({
    totalGiven: '0.00',
    totalAdvanceReceived: '0.00',
    totalPendingAdvance: '0.00',
    totalSalaryPaid: '0.00',
    count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modal: New Cash Entry
  const [showAddModal, setShowAddModal] = useState(false);
  const [karigarName, setKarigarName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<'ADVANCE' | 'SALARY' | 'OTHER'>('ADVANCE');
  const [amount, setAmount] = useState('');

  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [entryDate, setEntryDate] = useState<string>(getLocalDate);
  const [entryTime, setEntryTime] = useState<string>(getLocalTime);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal: Receipt Slip
  const [activeReceiptEntry, setActiveReceiptEntry] = useState<KarigarCashEntry | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const fetchEntries = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedStatus) params.set('status', selectedStatus);

    fetch(`/api/karigar-cash?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.entries) setEntries(data.entries);
        if (data.business) setBusiness(data.business);
        if (data.summary) setSummary(data.summary);
      })
      .catch((err) => console.error('Fetch karigar cash error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEntries();
  }, [searchTerm, selectedCategory, selectedStatus]);

  const uniqueKarigars = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>();
    entries.forEach((e) => {
      const key = e.karigarName.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, { name: e.karigarName.trim(), phone: e.phone || '' });
      }
    });
    return Array.from(map.values());
  }, [entries]);

  const handleOpenAddModal = () => {
    setKarigarName('');
    setPhone('');
    setCategory('ADVANCE');
    setAmount('');
    setEntryDate(getLocalDate());
    setEntryTime(getLocalTime());
    setErrorMessage(null);
    setShowAddModal(true);
  };

  const handleSubmitNewEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!karigarName.trim()) {
      setErrorMessage('Karigar name is required');
      return;
    }
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const combinedDateTime = new Date(`${entryDate}T${entryTime}:00`);

      const res = await fetch('/api/karigar-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          karigarName: karigarName.trim(),
          phone: phone.trim() || undefined,
          category,
          amount: numAmt,
          date: combinedDateTime.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record entry');
      }

      setSuccessToast(`Voucher ${data.entry.entryNumber} created`);
      setShowAddModal(false);
      fetchEntries();
      // Auto open receipt for quick sharing
      if (data.entry) {
        setActiveReceiptEntry(data.entry);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkReceived = async (entry: KarigarCashEntry) => {
    if (entry.category === 'SALARY') {
      alert('Salary is paid out to karigar and cannot be marked as received. Only advances are receivable.');
      return;
    }

    try {
      const res = await fetch(`/api/karigar-cash/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RECEIVED' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setSuccessToast(`Advance ${entry.entryNumber} marked as Received / Settled`);
      fetchEntries();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update entry');
    }
  };

  const handleDeleteEntry = async (entry: KarigarCashEntry) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete voucher ${entry.entryNumber} for ${entry.karigarName} (₹${parseFloat(entry.amount).toLocaleString('en-IN')})?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/karigar-cash/${entry.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete entry');

      setSuccessToast(`Voucher ${entry.entryNumber} deleted successfully`);
      if (activeReceiptEntry?.id === entry.id) {
        setActiveReceiptEntry(null);
      }
      fetchEntries();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const generateWhatsAppText = (entry: KarigarCashEntry) => {
    const formattedDate = new Date(entry.date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const isSalary = entry.category === 'SALARY';
    const statusText = isSalary
      ? '💼 PAID (Salary Disbursed)'
      : entry.status === 'RECEIVED'
      ? '✅ RECEIVED (Advance Settled)'
      : '⏳ GIVEN (Advance Receivable)';

    const typeText = isSalary
      ? '💼 Salary (Routine Payment)'
      : entry.category === 'ADVANCE'
      ? '🪙 Advance (Receivable)'
      : '📦 Other Cash';

    return `*━━━━━━━━━━━━━━━━━━━━━*
*${business.name.toUpperCase()}*
*Karigar Cash Voucher*
*━━━━━━━━━━━━━━━━━━━━━*
🧾 *Voucher No*: ${entry.entryNumber}
📅 *Date & Time*: ${formattedDate}
👤 *Karigar*: ${entry.karigarName}
🏷️ *Type*: ${typeText}
💰 *Amount*: ₹${parseFloat(entry.amount).toLocaleString('en-IN')}
📌 *Status*: ${statusText}
*━━━━━━━━━━━━━━━━━━━━━*
_Thank you - ${business.name}_`;
  };

  const handleShareWhatsApp = (entry: KarigarCashEntry) => {
    const text = generateWhatsAppText(entry);
    const cleanPhone = entry.phone.replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyVoucherText = (entry: KarigarCashEntry) => {
    const text = generateWhatsAppText(entry);
    navigator.clipboard.writeText(text);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Banknote className="w-6 h-6 text-emerald-600" />
            Karigar Cash Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track daily cash advances, salaries, and returns with karigars
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Give Cash (New Entry)</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Advance Pending (Receivable) */}
        <div className="bg-white rounded-2xl border border-amber-200/90 shadow-2xs p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            <span>Advance Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            ₹{parseFloat(summary.totalPendingAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">
            Receivable cash advances
          </div>
        </div>

        {/* Card 2: Advance Recovered (Settled) */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
            <span>Advance Recovered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            ₹{parseFloat(summary.totalAdvanceReceived).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1">
            Advances returned / settled
          </div>
        </div>

        {/* Card 3: Salary Paid */}
        <div className="bg-white rounded-2xl border border-blue-200/90 shadow-2xs p-5">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
            <span>Salary Paid</span>
            <Banknote className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-950 font-mono">
            ₹{parseFloat(summary.totalSalaryPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-blue-700/80 mt-1">
            Paid to karigars (not receivable)
          </div>
        </div>

        {/* Card 4: Total Cash Given */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Total Cash Given</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{parseFloat(summary.totalGiven).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total advances & salaries paid
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Karigar name or voucher #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
            >
              <option value="">All Categories (Advance / Salary / Other)</option>
              <option value="ADVANCE">Advance Only (Receivable)</option>
              <option value="SALARY">Salary Only (Expense)</option>
              <option value="OTHER">Other Only</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white"
            >
              <option value="">All Statuses (Pending & Settled)</option>
              <option value="GIVEN">Given / Pending</option>
              <option value="RECEIVED">Received / Settled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Entries */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Karigar Cash Ledgers</h2>
          <span className="text-xs text-slate-400 font-mono">
            {entries.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-4">Karigar Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : entries.length > 0 ? (
                entries.map((entry) => {
                  const entryDateObj = new Date(entry.date);
                  const dateStr = entryDateObj.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const timeStr = entryDateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {entry.entryNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{dateStr}</div>
                        <div className="text-[10px] text-slate-400">{timeStr}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{entry.karigarName}</span>
                        </div>
                        {entry.phone && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {entry.phone}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5">
                            &quot;{entry.notes}&quot;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.category === 'ADVANCE'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : entry.category === 'SALARY'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {entry.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-base text-slate-900">
                        ₹{parseFloat(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {entry.category === 'SALARY' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-bold">
                            <span>PAID (DISBURSED)</span>
                          </span>
                        ) : entry.status === 'RECEIVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>RECEIVED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>PENDING (RECEIVABLE)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* ONLY SHOW "Received" BUTTON FOR ADVANCE (OR OTHER) - NEVER FOR SALARY! */}
                          {entry.category !== 'SALARY' && entry.status === 'GIVEN' && (
                            <button
                              onClick={() => handleMarkReceived(entry)}
                              title="Click when Karigar returns/settles advance"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-2xs"
                            >
                              Received
                            </button>
                          )}

                          <button
                            onClick={() => handleShareWhatsApp(entry)}
                            title="Share voucher on WhatsApp"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setActiveReceiptEntry(entry)}
                            title="View / Print Receipt Slip"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            title="Delete this voucher"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No cash entries recorded yet. Click &quot;+ Give Cash&quot; to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Give Cash / New Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900">
                <Banknote className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-black">Give Cash to Karigar</h2>
                  <p className="text-xs text-slate-500">Record cash advance, salary, or expense</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNewEntry} className="p-6 space-y-4">
              {/* Tablet Contact Picker Banner */}
              <ContactPickerButton
                variant="banner"
                label="Pick Contact"
                onSelect={({ name: pickedName, phone: pickedPhone }) => {
                  if (pickedName) setKarigarName(pickedName);
                  if (pickedPhone) setPhone(pickedPhone);
                }}
              />

              {/* Karigar Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Karigar Name *
                  </label>
                  {uniqueKarigars.length > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {uniqueKarigars.length} saved karigars
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  list="karigars-datalist"
                  value={karigarName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setKarigarName(val);
                    const matched = uniqueKarigars.find(
                      (k) => k.name.toLowerCase() === val.toLowerCase()
                    );
                    if (matched && matched.phone && !phone) {
                      setPhone(matched.phone);
                    }
                  }}
                  placeholder="Type name or pick from tablet..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                />
                <datalist id="karigars-datalist">
                  {uniqueKarigars.map((k) => (
                    <option key={k.name} value={k.name}>
                      {k.phone ? `Phone: ${k.phone}` : ''}
                    </option>
                  ))}
                </datalist>

                {/* Quick Selection Chips from existing karigars */}
                {uniqueKarigars.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Quick Pick:</span>
                    {uniqueKarigars.slice(0, 5).map((k) => (
                      <button
                        key={k.name}
                        type="button"
                        onClick={() => {
                          setKarigarName(k.name);
                          if (k.phone) setPhone(k.phone);
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-semibold transition"
                      >
                        {k.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phone / WhatsApp (Optional)
                  </label>
                  <ContactPickerButton
                    variant="button"
                    label="Pick from Tablet"
                    className="text-[10px] py-0.5 px-2"
                    onSelect={({ name: pickedName, phone: pickedPhone }) => {
                      if (pickedName && !karigarName) setKarigarName(pickedName);
                      if (pickedPhone) setPhone(pickedPhone);
                    }}
                  />
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Used for sending receipt directly on WhatsApp</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Type / Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('ADVANCE')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition text-center ${
                      category === 'ADVANCE'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-2xs ring-1 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🪙 Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('SALARY')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition text-center ${
                      category === 'SALARY'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-2xs ring-1 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    💼 Salary
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('OTHER')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition text-center ${
                      category === 'OTHER'
                        ? 'bg-slate-200 border-slate-700 text-slate-900 shadow-2xs ring-1 ring-slate-700/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    📦 Other
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Amount Given (₹) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Generate Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Small Receipt / Voucher Slip */}
      {activeReceiptEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 no-print">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Karigar Cash Voucher
              </span>
              <button
                onClick={() => setActiveReceiptEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Printable Small Voucher Slip */}
            <div className="print-slip p-6 bg-white space-y-4 text-slate-900 text-xs">
              {/* Slip Header */}
              <div className="text-center pb-3 border-b border-slate-200 space-y-0.5">
                <div className="font-black text-sm uppercase tracking-tight">{business.name}</div>
                <div className="text-[10px] text-slate-500">{business.address}</div>
                <div className="text-[10px] text-slate-400 font-mono">Phone: {business.phone}</div>
                <div className="pt-1.5">
                  <span className="inline-block px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded">
                    CASH VOUCHER
                  </span>
                </div>
              </div>

              {/* Voucher Meta */}
              <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-100">
                <div>
                  <span className="text-slate-400">Voucher: </span>
                  <strong className="font-mono">{activeReceiptEntry.entryNumber}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Date: </span>
                  <strong className="font-mono">
                    {new Date(activeReceiptEntry.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                </div>
              </div>

              {/* Karigar & Type Details */}
              <div className="space-y-1.5 py-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Karigar Name:</span>
                  <span className="font-black text-slate-900">{activeReceiptEntry.karigarName}</span>
                </div>
                {activeReceiptEntry.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono text-slate-700">{activeReceiptEntry.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Category:</span>
                  <span className="font-bold text-slate-900">
                    {activeReceiptEntry.category === 'SALARY'
                      ? '💼 Salary'
                      : activeReceiptEntry.category === 'ADVANCE'
                      ? '🪙 Advance'
                      : '📦 Other'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Status:</span>
                  <span
                    className={`font-bold ${
                      activeReceiptEntry.category === 'SALARY'
                        ? 'text-blue-700'
                        : activeReceiptEntry.status === 'RECEIVED'
                        ? 'text-emerald-700'
                        : 'text-amber-800'
                    }`}
                  >
                    {activeReceiptEntry.category === 'SALARY'
                      ? 'PAID (Disbursed)'
                      : activeReceiptEntry.status === 'RECEIVED'
                      ? 'RECEIVED (Settled)'
                      : 'PENDING (Receivable)'}
                  </span>
                </div>
                {activeReceiptEntry.notes && (
                  <div className="pt-1">
                    <span className="text-slate-500">Note: </span>
                    <span className="text-slate-800 italic">{activeReceiptEntry.notes}</span>
                  </div>
                )}
              </div>

              {/* Big Amount Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  {activeReceiptEntry.category === 'SALARY' ? 'Salary Amount Paid' : 'Cash Advance Given'}
                </div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  ₹{parseFloat(activeReceiptEntry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Slip Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 no-print">
              <button
                onClick={() => handleShareWhatsApp(activeReceiptEntry)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share on WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyVoucherText(activeReceiptEntry)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  {copiedVoucher ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedVoucher ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  onClick={handlePrintVoucher}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>

              <button
                onClick={() => handleDeleteEntry(activeReceiptEntry)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
