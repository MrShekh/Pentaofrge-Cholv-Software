'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Plus,
  Minus,
  Banknote,
  Clock,
  CheckCircle2,
  Trash2,
  Pencil,
  FileText,
  Printer,
  Share2,
  Copy,
  Check,
  AlertCircle,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  User,
} from 'lucide-react';

interface CashEntry {
  id: string;
  entryNumber: string;
  karigarId: string | null;
  karigarName: string;
  phone: string;
  category: 'ADVANCE' | 'SALARY' | 'OTHER';
  amount: string;
  date: string;
  status: 'GIVEN' | 'RECEIVED' | 'PAID';
  settledAt: string | null;
  notes: string;
  createdAt: string;
}

interface KarigarSettlement {
  id: string;
  settlementNumber: string;
  karigarId: string;
  fromDate: string;
  toDate: string;
  months: number;
  monthlySalary: string;
  totalSalary: string;
  totalAdvanceGiven: string;
  difference: string;
  settledAmount: string;
  carriedForward: string;
  action: 'FULL_CLEAR' | 'CARRY_FORWARD';
  notes: string | null;
  settledAt: string;
  createdAt: string;
}

interface KarigarData {
  karigar: {
    id: string;
    name: string;
    phone: string;
    salary: string;
    joiningDate: string;
    notes: string;
    createdAt: string;
  };
  settlements?: KarigarSettlement[];
  cashEntries: CashEntry[];
  summary: {
    totalPendingAdvance: string;
    totalAdvanceGiven: string;
    totalAdvanceReceived: string;
    totalSalaryPaid: string;
    entriesCount: number;
  };
  business: {
    name: string;
    ownerName: string;
    phone: string;
    address: string;
  };
}

export default function KarigarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<KarigarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state for ledger
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ADVANCE' | 'SALARY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');

  // Modal: Add Cash Entry
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryCategory, setEntryCategory] = useState<'ADVANCE' | 'SALARY'>('ADVANCE');
  const [entryAction, setEntryAction] = useState<'GIVEN' | 'RECEIVED'>('GIVEN'); // For Advance: Give or Settle
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

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

  // Modal: Receipt Slip
  const [activeReceiptEntry, setActiveReceiptEntry] = useState<CashEntry | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // Modal: Full Statement
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [copiedStatement, setCopiedStatement] = useState(false);

  // Modal: Edit Karigar
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Modal: Settlement Calculation (Notebook style)
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settleFromDate, setSettleFromDate] = useState('');
  const [settleToDate, setSettleToDate] = useState('');
  const [settleMonths, setSettleMonths] = useState('1');
  const [settleMonthlySalary, setSettleMonthlySalary] = useState('');
  const [settleAction, setSettleAction] = useState<'FULL_CLEAR' | 'CARRY_FORWARD'>('FULL_CLEAR');
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  // Modal: Settlement Slip
  const [activeSettlementSlip, setActiveSettlementSlip] = useState<KarigarSettlement | null>(null);
  const [copiedSettlementSlip, setCopiedSettlementSlip] = useState(false);

  // Modal: Delete Karigar
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchKarigar = () => {
    setIsLoading(true);
    fetch(`/api/karigars/${id}`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((d) => {
        if (d) {
          setData(d);
          setEditName(d.karigar.name);
          setEditPhone(d.karigar.phone || '');
          setEditSalary(d.karigar.salary ? parseFloat(d.karigar.salary).toString() : '0');
          setEditJoiningDate(
            d.karigar.joiningDate ? new Date(d.karigar.joiningDate).toISOString().slice(0, 16) : ''
          );
          setEditNotes(d.karigar.notes || '');
        }
      })
      .catch((err) => console.warn('Fetch karigar warning:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchKarigar();
  }, [id]);

  const openAddEntryModal = (
    cat: 'ADVANCE' | 'SALARY',
    action: 'GIVEN' | 'RECEIVED' = 'GIVEN'
  ) => {
    setEntryCategory(cat);
    setEntryAction(action);
    setAmount('');
    setNotes('');
    setEntryDate(getLocalDate());
    setEntryTime(getLocalTime());
    setErrorMessage(null);
    setShowEntryModal(true);
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

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
          karigarId: data.karigar.id,
          karigarName: data.karigar.name,
          phone: data.karigar.phone || undefined,
          category: entryCategory,
          status: entryCategory === 'ADVANCE' && entryAction === 'RECEIVED' ? 'RECEIVED' : 'GIVEN',
          amount: numAmt,
          date: combinedDateTime.toISOString(),
          notes: notes.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to record entry');

      setToastMessage(`Voucher ${resData.entry.entryNumber} recorded successfully`);
      setShowEntryModal(false);
      fetchKarigar();
      // Auto open voucher preview
      if (resData.entry) {
        setActiveReceiptEntry(resData.entry);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEntryStatus = async (entry: CashEntry) => {
    if (entry.category === 'SALARY') {
      alert('Salary is an expense paid out and cannot be marked as received.');
      return;
    }

    const nextStatus = entry.status === 'RECEIVED' ? 'GIVEN' : 'RECEIVED';
    try {
      const res = await fetch(`/api/karigar-cash/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update entry');

      setToastMessage(
        nextStatus === 'RECEIVED'
          ? `Advance ${entry.entryNumber} marked as Settled / Received`
          : `Advance ${entry.entryNumber} reopened as Pending`
      );
      fetchKarigar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update entry');
    }
  };

  const handleDeleteEntry = async (entry: CashEntry) => {
    const confirmed = window.confirm(
      `Delete voucher ${entry.entryNumber} (₹${parseFloat(entry.amount).toLocaleString('en-IN')})?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/karigar-cash/${entry.id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete');

      setToastMessage(`Voucher ${entry.entryNumber} deleted`);
      if (activeReceiptEntry?.id === entry.id) setActiveReceiptEntry(null);
      fetchKarigar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const handleUpdateKarigar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/karigars/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          salary: editSalary ? parseFloat(editSalary) : 0,
          joiningDate: editJoiningDate ? new Date(editJoiningDate).toISOString() : undefined,
          notes: editNotes.trim() || null,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update karigar');

      setToastMessage('Karigar details and salary updated');
      setShowEditModal(false);
      fetchKarigar();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSettlementModal = () => {
    if (!data) return;

    // Default From Date: latest settlement toDate or karigar's joiningDate
    let fromD = data.karigar.joiningDate
      ? new Date(data.karigar.joiningDate)
      : new Date(data.karigar.createdAt);

    if (data.settlements && data.settlements.length > 0) {
      const latest = data.settlements[0];
      fromD = new Date(latest.toDate);
    }

    const toD = new Date();
    const fromIso = fromD.toISOString().slice(0, 10);
    const toIso = toD.toISOString().slice(0, 10);

    const diffDays = Math.max(1, Math.ceil(Math.abs(toD.getTime() - fromD.getTime()) / (1000 * 60 * 60 * 24)));
    const approxMonths = Math.max(1, Math.round((diffDays / 30.4375) * 10) / 10);

    setSettleFromDate(fromIso);
    setSettleToDate(toIso);
    setSettleMonths(approxMonths.toString());
    setSettleMonthlySalary(data.karigar.salary ? parseFloat(data.karigar.salary).toString() : '0');
    setSettleAction('FULL_CLEAR');
    setSettleNotes(`Settlement calculation for ${approxMonths} month(s)`);
    setSettleError(null);
    setShowSettlementModal(true);
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const monthsNum = parseFloat(settleMonths);
    if (isNaN(monthsNum) || monthsNum <= 0) {
      setSettleError('Please enter valid working months (e.g. 6)');
      return;
    }

    const salaryNum = parseFloat(settleMonthlySalary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      setSettleError('Please enter a valid monthly salary');
      return;
    }

    setIsSettling(true);
    setSettleError(null);

    try {
      const res = await fetch(`/api/karigars/${id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: new Date(settleFromDate).toISOString(),
          toDate: new Date(settleToDate).toISOString(),
          months: monthsNum,
          monthlySalary: salaryNum,
          action: settleAction,
          notes: settleNotes.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to settle karigar account');

      setToastMessage(`Account settled successfully: ${resData.settlement.settlementNumber}`);
      setShowSettlementModal(false);
      setActiveSettlementSlip(resData.settlement);
      fetchKarigar();
    } catch (err: unknown) {
      setSettleError(err instanceof Error ? err.message : 'Error settling account');
    } finally {
      setIsSettling(false);
    }
  };

  const handleDeleteKarigar = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/karigars/${id}`, {
        method: 'DELETE',
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to delete karigar');

      router.push('/karigar-cash');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting karigar');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // WhatsApp & Statement generators
  const generateVoucherWhatsAppText = (entry: CashEntry) => {
    if (!data) return '';
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
      ? '🪙 Advance (Cash)'
      : '📦 Cash Entry';

    return `*━━━━━━━━━━━━━━━━━━━━━*
*${data.business.name.toUpperCase()}*
*Karigar Cash Voucher*
*━━━━━━━━━━━━━━━━━━━━━*
🧾 *Voucher No*: ${entry.entryNumber}
📅 *Date & Time*: ${formattedDate}
👤 *Karigar*: ${entry.karigarName}
🏷️ *Type*: ${typeText}
💰 *Amount*: ₹${parseFloat(entry.amount).toLocaleString('en-IN')}
📌 *Status*: ${statusText}
${entry.notes ? `📝 *Notes*: ${entry.notes}\n` : ''}*━━━━━━━━━━━━━━━━━━━━━*
_Thank you - ${data.business.name}_`;
  };

  const handleShareVoucherWhatsApp = (entry: CashEntry) => {
    const text = generateVoucherWhatsAppText(entry);
    const cleanPhone = (entry.phone || data?.karigar.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const generateStatementWhatsAppText = () => {
    if (!data) return '';
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let lines = `*━━━━━━━━━━━━━━━━━━━━━*\n`;
    lines += `*${data.business.name.toUpperCase()}*\n`;
    lines += `*KARIGAR CASH STATEMENT*\n`;
    lines += `*━━━━━━━━━━━━━━━━━━━━━*\n`;
    lines += `👤 *Karigar*: ${data.karigar.name}\n`;
    if (data.karigar.phone) lines += `📞 *Phone*: ${data.karigar.phone}\n`;
    lines += `📅 *As of*: ${dateStr}\n\n`;

    lines += `*─── CALCULATION SUMMARY ───*\n`;
    lines += `🪙 *Total Advance Given*: ₹${parseFloat(data.summary.totalAdvanceGiven).toLocaleString('en-IN')}\n`;
    lines += `✅ *Advance Settled/Repaid*: ₹${parseFloat(data.summary.totalAdvanceReceived).toLocaleString('en-IN')}\n`;
    lines += `⚠️ *CURRENT PENDING ADVANCE*: ₹${parseFloat(data.summary.totalPendingAdvance).toLocaleString('en-IN')}\n`;
    lines += `💼 *Total Salary Paid*: ₹${parseFloat(data.summary.totalSalaryPaid).toLocaleString('en-IN')}\n`;
    lines += `*━━━━━━━━━━━━━━━━━━━━━*\n\n`;

    lines += `*─── RECENT VOUCHERS ───*\n`;
    data.cashEntries.slice(0, 10).forEach((e) => {
      const dt = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const tag = e.category === 'SALARY' ? 'Salary' : e.status === 'RECEIVED' ? 'Adv Settled' : 'Adv Given';
      lines += `• ${e.entryNumber} (${dt}): ₹${parseFloat(e.amount).toLocaleString('en-IN')} [${tag}]\n`;
    });

    lines += `\n*━━━━━━━━━━━━━━━━━━━━━*\n`;
    lines += `_${data.business.name} | ${data.business.phone}_`;
    return lines;
  };

  const handleShareStatementWhatsApp = () => {
    const text = generateStatementWhatsAppText();
    const cleanPhone = (data?.karigar.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const generateSettlementSlipWhatsAppText = (slip: KarigarSettlement) => {
    if (!data) return '';
    const diffVal = parseFloat(slip.difference);
    const isAdvExtra = diffVal >= 0;
    const fromStr = new Date(slip.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const toStr = new Date(slip.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let lines = `*━━━━━━━━━━━━━━━━━━━━━*\n`;
    lines += `*${data.business.name.toUpperCase()}*\n`;
    lines += `*KARIGAR VILLAGE / PERIOD SETTLEMENT*\n`;
    lines += `*━━━━━━━━━━━━━━━━━━━━━*\n`;
    lines += `🧾 *Settlement No*: ${slip.settlementNumber}\n`;
    lines += `👤 *Karigar*: ${data.karigar.name}\n`;
    if (data.karigar.phone) lines += `📞 *Phone*: ${data.karigar.phone}\n`;
    lines += `📅 *Settled Date*: ${new Date(slip.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
    lines += `🗓️ *Period*: ${fromStr} to ${toStr}\n`;
    lines += `⏱️ *Duration*: ${slip.months} Month(s)\n\n`;

    lines += `*─── NOTEBOOK CALCULATION ───*\n`;
    lines += `💼 *Monthly Salary*: ₹${parseFloat(slip.monthlySalary).toLocaleString('en-IN')}\n`;
    lines += `💵 *Total Salary Earned*: ₹${parseFloat(slip.totalSalary).toLocaleString('en-IN')} (${slip.months} mos × ₹${parseFloat(slip.monthlySalary).toLocaleString('en-IN')})\n`;
    lines += `🪙 *Total Advance Given*: ₹${parseFloat(slip.totalAdvanceGiven).toLocaleString('en-IN')}\n`;
    lines += `*─────────────────────*\n`;
    lines += `📊 *DIFFERENCE*: ${isAdvExtra ? `Advance Given Exceeds Salary by ₹${diffVal.toLocaleString('en-IN')}` : `Salary Exceeds Advance by ₹${Math.abs(diffVal).toLocaleString('en-IN')}`}\n`;
    lines += `⚖️ *SETTLEMENT ACTION*: ${
      slip.action === 'CARRY_FORWARD'
        ? `Carried forward extra ₹${parseFloat(slip.carriedForward).toLocaleString('en-IN')} advance to next cycle`
        : 'Full Clear (Current Balance set to ₹0)'
    }\n`;
    if (slip.notes) lines += `📝 *Notes*: ${slip.notes}\n`;
    lines += `*━━━━━━━━━━━━━━━━━━━━━*\n`;
    lines += `_${data.business.name} | Authorized Signature_`;
    return lines;
  };

  const handleShareSettlementSlipWhatsApp = (slip: KarigarSettlement) => {
    const text = generateSettlementSlipWhatsAppText(slip);
    const cleanPhone = (data?.karigar.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (isLoading && !data) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading karigar folder...</div>;
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-600">
        <p className="font-bold">Karigar folder not found</p>
        <Link href="/karigar-cash" className="text-xs text-emerald-700 underline mt-2 inline-block">
          Back to Karigar Cash
        </Link>
      </div>
    );
  }

  const { karigar, cashEntries, summary, business } = data;

  // Filter entries
  const filteredEntries = cashEntries.filter((e) => {
    if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
    if (statusFilter === 'PENDING' && (e.category !== 'ADVANCE' || e.status !== 'GIVEN')) return false;
    if (statusFilter === 'SETTLED' && (e.category !== 'ADVANCE' || e.status !== 'RECEIVED')) return false;
    return true;
  });

  const pendingNum = parseFloat(summary.totalPendingAdvance);
  const isAdvanceClean = pendingNum <= 0;

  return (
    <div className="space-y-6">
      {/* Navigation and Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/karigar-cash"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Karigar Cash
        </Link>

        <button
          onClick={() => setShowStatementModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Complete Statement</span>
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

      {/* Karigar Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {karigar.name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                !isAdvanceClean
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {!isAdvanceClean ? `₹${pendingNum.toLocaleString('en-IN')} Advance Pending` : 'All Settled'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            {karigar.phone ? (
              <a
                href={`tel:${karigar.phone}`}
                className="flex items-center gap-1 font-medium hover:text-slate-800"
              >
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {karigar.phone}
              </a>
            ) : (
              <span className="text-slate-400">No phone provided</span>
            )}
            {karigar.phone && (
              <a
                href={`https://wa.me/${karigar.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
              >
                WhatsApp
              </a>
            )}

            {parseFloat(karigar.salary || '0') > 0 ? (
              <span className="flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                <Banknote className="w-3.5 h-3.5 text-purple-600" />
                Monthly Salary: ₹{parseFloat(karigar.salary).toLocaleString('en-IN')}/mo
              </span>
            ) : (
              <button
                onClick={() => setShowEditModal(true)}
                className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
              >
                + Set Monthly Salary
              </button>
            )}

            {karigar.joiningDate && (
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Joined {new Date(karigar.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons right in header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openAddEntryModal('ADVANCE', 'GIVEN')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Give Advance</span>
          </button>

          <button
            onClick={openSettlementModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Banknote className="w-4 h-4" />
            <span>🤝 Settle Account (Notebook)</span>
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            title="Edit Karigar & Salary"
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            title="Delete Karigar"
            className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Financial Calculation Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Advance Balance */}
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-2xs p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            <span>Pending Advance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            ₹{parseFloat(summary.totalPendingAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Receivable from karigar
          </div>
        </div>

        {/* Total Advance Given */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            <span>Total Advance Given</span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{parseFloat(summary.totalAdvanceGiven).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            All advances disbursed
          </div>
        </div>

        {/* Advance Settled / Returned */}
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-2xs p-5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
            <span>Advance Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            ₹{parseFloat(summary.totalAdvanceReceived).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Repaid or adjusted back
          </div>
        </div>

        {/* Monthly Salary */}
        <div className="bg-white rounded-2xl border border-purple-200 shadow-2xs p-5">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800 uppercase tracking-wider mb-2">
            <span>Monthly Salary</span>
            <Banknote className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-950 font-mono">
            ₹{parseFloat(karigar.salary || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-purple-700 font-medium mt-1">
            Agreed monthly pay
          </div>
        </div>
      </div>

      {/* Calculation Formula Banner */}
      <div className="bg-slate-50 rounded-xl border border-slate-200/90 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap text-slate-700">
          <span className="font-semibold text-slate-500">Advance Ledger Formula:</span>
          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono font-medium">
            Given ₹{parseFloat(summary.totalAdvanceGiven).toLocaleString('en-IN')}
          </span>
          <span className="font-black text-slate-400">−</span>
          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono font-medium">
            Settled ₹{parseFloat(summary.totalAdvanceReceived).toLocaleString('en-IN')}
          </span>
          <span className="font-black text-slate-400">=</span>
          <span className={`px-2 py-0.5 rounded font-mono font-bold ${!isAdvanceClean ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'}`}>
            Pending ₹{parseFloat(summary.totalPendingAdvance).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          {isAdvanceClean ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All advance accounts are fully settled
            </span>
          ) : (
            <span className="text-amber-800 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Karigar currently owes ₹{pendingNum.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Transactions Ledger Table Header & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cash Transactions Ledger</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              History of all cash advances, settlements, and salary payments for {karigar.name}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setCategoryFilter('ALL'); setStatusFilter('ALL'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                categoryFilter === 'ALL' && statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({cashEntries.length})
            </button>
            <button
              onClick={() => { setCategoryFilter('ADVANCE'); setStatusFilter('PENDING'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                categoryFilter === 'ADVANCE' && statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Pending Advances
            </button>
            <button
              onClick={() => { setCategoryFilter('ADVANCE'); setStatusFilter('SETTLED'); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                categoryFilter === 'ADVANCE' && statusFilter === 'SETTLED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Settled Advances
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No cash transactions found for this filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isSalary = e.category === 'SALARY';
                  const isAdvanceReceived = e.category === 'ADVANCE' && e.status === 'RECEIVED';
                  const isAdvancePending = e.category === 'ADVANCE' && e.status === 'GIVEN';

                  const dateFormatted = new Date(e.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const timeFormatted = new Date(e.date).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{dateFormatted}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{timeFormatted}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                        {e.entryNumber}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSalary ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Banknote className="w-3 h-3" /> Salary Paid
                          </span>
                        ) : isAdvanceReceived ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" /> Advance Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <ArrowUpRight className="w-3 h-3" /> Advance Given
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                        <span className={isSalary ? 'text-purple-700' : isAdvanceReceived ? 'text-emerald-700' : 'text-amber-800'}>
                          ₹{parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isSalary ? (
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            Disbursed
                          </span>
                        ) : isAdvancePending ? (
                          <button
                            onClick={() => handleToggleEntryStatus(e)}
                            title="Click to mark this advance as Settled / Returned"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border border-amber-200 hover:border-emerald-300 rounded-lg text-[10px] font-bold transition group"
                          >
                            <Clock className="w-3 h-3 text-amber-600 group-hover:hidden" />
                            <Check className="w-3 h-3 text-emerald-600 hidden group-hover:inline" />
                            <span>Mark Settled</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleEntryStatus(e)}
                            title="Settled! Click to reopen if marked by mistake"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-semibold hover:border-amber-300 transition"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Settled</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {e.notes || <span className="text-slate-300">—</span>}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveReceiptEntry(e)}
                            title="View / Print Receipt Slip"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareVoucherWhatsApp(e)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(e)}
                            title="Delete Voucher"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Village & Period Settlement History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Settlement History (Village Khata)</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {data.settlements?.length || 0} Settled Cycles
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Permanent record of past notebook calculations, village departures &amp; zero-settlements
            </p>
          </div>

          <button
            onClick={openSettlementModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>+ Settle Account</span>
          </button>
        </div>

        {(!data.settlements || data.settlements.length === 0) ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No past settlements recorded yet. Click &quot;Settle Account&quot; to calculate salary vs advance and settle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Settlement #</th>
                  <th className="py-3 px-4">Settled On</th>
                  <th className="py-3 px-4">Work Period</th>
                  <th className="py-3 px-4">Monthly Salary</th>
                  <th className="py-3 px-4">Total Salary</th>
                  <th className="py-3 px-4">Advance Given</th>
                  <th className="py-3 px-4">Difference</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4 text-right">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data.settlements.map((s) => {
                  const diffVal = parseFloat(s.difference);
                  const isAdvExtra = diffVal >= 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-indigo-900">
                        {s.settlementNumber}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {new Date(s.settledAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {s.months} mos
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {new Date(s.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(s.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        ₹{parseFloat(s.monthlySalary).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-purple-700">
                        ₹{parseFloat(s.totalSalary).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-amber-800">
                        ₹{parseFloat(s.totalAdvanceGiven).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                        {isAdvExtra ? (
                          <span className="text-amber-800">
                            +₹{diffVal.toLocaleString('en-IN')} (Extra)
                          </span>
                        ) : (
                          <span className="text-emerald-700">
                            -₹{Math.abs(diffVal).toLocaleString('en-IN')} (Due)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.action === 'CARRY_FORWARD' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Carried Fwd ₹{parseFloat(s.carriedForward).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Khata Nil (₹0)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveSettlementSlip(s)}
                            title="View / Print Slip"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleShareSettlementSlipWhatsApp(s)}
                            title="Share on WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Notebook Settlement Calculation */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold">Settle Karigar Account: {karigar.name}</h2>
                  <p className="text-[10px] text-slate-300">Notebook calculation: Advance Given vs Salary Earned</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSettlement} className="p-5 overflow-y-auto space-y-4">
              {settleError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {settleError}
                </div>
              )}

              {/* Working Period Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Period From (Start Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={settleFromDate}
                    onChange={(e) => {
                      setSettleFromDate(e.target.value);
                      if (e.target.value && settleToDate) {
                        const d1 = new Date(e.target.value);
                        const d2 = new Date(settleToDate);
                        const diffDays = Math.max(1, Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
                        const m = Math.max(1, Math.round((diffDays / 30.4375) * 10) / 10);
                        setSettleMonths(m.toString());
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Period To (Settlement Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={settleToDate}
                    onChange={(e) => {
                      setSettleToDate(e.target.value);
                      if (settleFromDate && e.target.value) {
                        const d1 = new Date(settleFromDate);
                        const d2 = new Date(e.target.value);
                        const diffDays = Math.max(1, Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
                        const m = Math.max(1, Math.round((diffDays / 30.4375) * 10) / 10);
                        setSettleMonths(m.toString());
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Working Duration & Monthly Salary */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Working Duration (Months) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 6"
                    value={settleMonths}
                    onChange={(e) => setSettleMonths(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 6 months worked</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Salary (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="e.g. 10000"
                      value={settleMonthlySalary}
                      onChange={(e) => setSettleMonthlySalary(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Agreed fixed monthly pay</span>
                </div>
              </div>

              {/* Live Notebook Calculation Box */}
              {(() => {
                const currentPendingAdv = parseFloat(summary.totalPendingAdvance);
                const mNum = parseFloat(settleMonths) || 0;
                const salNum = parseFloat(settleMonthlySalary) || 0;
                const totSal = mNum * salNum;
                const diff = currentPendingAdv - totSal;
                const isExtraAdv = diff > 0;
                const isDueToKarigar = diff < 0;
                const absDiff = Math.abs(diff);

                return (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 font-mono">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Notebook Calculation Summary
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Total Advance Given (Pending):</span>
                        <span className="font-bold text-amber-900">
                          ₹{currentPendingAdv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">
                          Total Salary ({mNum} mos × ₹{salNum.toLocaleString('en-IN')}):
                        </span>
                        <span className="font-bold text-purple-800">
                          ₹{totSal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between items-center text-sm font-bold">
                        <span>
                          {isExtraAdv ? 'Extra Advance Taken:' : isDueToKarigar ? 'Balance Due to Karigar:' : 'Difference:'}
                        </span>
                        <span className={isExtraAdv ? 'text-amber-800' : isDueToKarigar ? 'text-emerald-700' : 'text-slate-900'}>
                          ₹{absDiff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] p-2.5 rounded-lg bg-white border border-slate-200 font-sans">
                      {isExtraAdv ? (
                        <span className="text-amber-800 font-medium">
                          ⚠️ Karigar has taken <strong>₹{absDiff.toLocaleString('en-IN')}</strong> more than his {mNum} months salary.
                        </span>
                      ) : isDueToKarigar ? (
                        <span className="text-emerald-800 font-medium">
                          💼 Karigar earned <strong>₹{absDiff.toLocaleString('en-IN')}</strong> more than the advance taken.
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-medium">
                          ✅ Salary and Advance match exactly (₹0 difference).
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Settlement Action Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  How should this be settled? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Full Clear / Khata Nil */}
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition ${
                      settleAction === 'FULL_CLEAR'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="settleAction"
                        checked={settleAction === 'FULL_CLEAR'}
                        onChange={() => setSettleAction('FULL_CLEAR')}
                        className="text-indigo-600"
                      />
                      <span className="font-bold">Full Clear (Make Balance ₹0)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-5">
                      All unsettled advances marked settled. Karigar pending balance becomes ₹0.
                    </p>
                  </label>

                  {/* Option 2: Carry Forward */}
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition ${
                      settleAction === 'CARRY_FORWARD'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="settleAction"
                        checked={settleAction === 'CARRY_FORWARD'}
                        onChange={() => setSettleAction('CARRY_FORWARD')}
                        className="text-indigo-600"
                      />
                      <span className="font-bold">Carry Forward Extra Advance</span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-5">
                      Settles current cycle and carries forward the extra advance to next cycle.
                    </p>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Settlement Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karigar going to village, settled 6 months advance"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <Banknote className="w-4 h-4" />
                  <span>{isSettling ? 'Settling...' : 'Confirm & Settle Karigar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Settlement Voucher Slip */}
      {activeSettlementSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Settlement Slip #{activeSettlementSlip.settlementNumber}</span>
              <button
                onClick={() => setActiveSettlementSlip(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slip content */}
            <div id="settlement-slip" className="p-5 bg-white font-mono text-xs space-y-3">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-sm text-slate-900 uppercase">{business.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{business.address}</div>
                <div className="text-[10px] text-slate-500">Phone: {business.phone}</div>
                <div className="mt-2 text-xs font-bold text-indigo-900">
                  KARIGAR SETTLEMENT SLIP
                </div>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement No:</span>
                  <span className="font-bold text-slate-900">{activeSettlementSlip.settlementNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settled On:</span>
                  <span>{new Date(activeSettlementSlip.settledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Karigar:</span>
                  <span className="font-bold text-slate-900">{karigar.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Work Period:</span>
                  <span>
                    {new Date(activeSettlementSlip.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {new Date(activeSettlementSlip.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold">{activeSettlementSlip.months} Month(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Salary:</span>
                  <span>₹{parseFloat(activeSettlementSlip.monthlySalary).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="text-slate-500">Total Salary Earned:</span>
                  <span className="font-bold text-purple-700">₹{parseFloat(activeSettlementSlip.totalSalary).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Advance Given:</span>
                  <span className="font-bold text-amber-800">₹{parseFloat(activeSettlementSlip.totalAdvanceGiven).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1">
                  <span className="text-slate-500 font-bold">Difference:</span>
                  <span className="font-bold">
                    {parseFloat(activeSettlementSlip.difference) >= 0
                      ? `+₹${parseFloat(activeSettlementSlip.difference).toLocaleString('en-IN')} (Advance Extra)`
                      : `-₹${Math.abs(parseFloat(activeSettlementSlip.difference)).toLocaleString('en-IN')} (Salary Due)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Action Taken:</span>
                  <span className="font-bold text-indigo-900">
                    {activeSettlementSlip.action === 'CARRY_FORWARD'
                      ? `Carried Fwd ₹${parseFloat(activeSettlementSlip.carriedForward).toLocaleString('en-IN')}`
                      : 'Full Clear (Khata Nil)'}
                  </span>
                </div>
                {activeSettlementSlip.notes && (
                  <div className="flex justify-between pt-1 text-[10px] text-slate-400">
                    <span>Notes: {activeSettlementSlip.notes}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2.5 flex justify-between items-center text-xs font-bold">
                <span>SETTLED AMOUNT:</span>
                <span>₹{parseFloat(activeSettlementSlip.settledAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-1">
                Authorized Signatory
              </div>
            </div>

            {/* Slip action bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const text = generateSettlementSlipWhatsAppText(activeSettlementSlip);
                  navigator.clipboard.writeText(text);
                  setCopiedSettlementSlip(true);
                  setTimeout(() => setCopiedSettlementSlip(false), 2000);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                {copiedSettlementSlip ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSettlementSlip ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleShareSettlementSlipWhatsApp(activeSettlementSlip)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Cash Entry (Give Advance / Settle / Pay Salary) */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold">
                  Give Advance to {karigar.name}
                </h2>
              </div>
              <button
                onClick={() => setShowEntryModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Purpose (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly advance, Festival bonus, Settlement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                >
                  {isSubmitting ? 'Recording...' : '+ Give Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receipt Slip Voucher */}
      {activeReceiptEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Voucher Slip #{activeReceiptEntry.entryNumber}</span>
              <button
                onClick={() => setActiveReceiptEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slip content */}
            <div id="receipt-slip" className="p-5 bg-white font-mono text-xs space-y-3">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-sm text-slate-900 uppercase">{business.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{business.address}</div>
                <div className="text-[10px] text-slate-500">Phone: {business.phone}</div>
                <div className="mt-2 text-xs font-bold text-slate-800">KARIGAR CASH VOUCHER</div>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Voucher No:</span>
                  <span className="font-bold text-slate-900">{activeReceiptEntry.entryNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date &amp; Time:</span>
                  <span>{new Date(activeReceiptEntry.date).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Karigar:</span>
                  <span className="font-bold text-slate-900">{activeReceiptEntry.karigarName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-bold">
                    {activeReceiptEntry.category === 'SALARY' ? 'Salary Paid' : 'Cash Advance'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold">
                    {activeReceiptEntry.category === 'SALARY'
                      ? 'Disbursed'
                      : activeReceiptEntry.status === 'RECEIVED'
                      ? 'Settled / Repaid'
                      : 'Pending (Receivable)'}
                  </span>
                </div>
                {activeReceiptEntry.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notes:</span>
                    <span>{activeReceiptEntry.notes}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-3 flex justify-between items-center text-sm font-bold">
                <span>AMOUNT:</span>
                <span>₹{parseFloat(activeReceiptEntry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-1">
                Authorized Signatory
              </div>
            </div>

            {/* Slip action bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const text = generateVoucherWhatsAppText(activeReceiptEntry);
                  navigator.clipboard.writeText(text);
                  setCopiedVoucher(true);
                  setTimeout(() => setCopiedVoucher(false), 2000);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                {copiedVoucher ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedVoucher ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleShareVoucherWhatsApp(activeReceiptEntry)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete Statement */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold">Karigar Statement: {karigar.name}</span>
              </div>
              <button
                onClick={() => setShowStatementModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="border-b border-slate-200 pb-3">
                <div className="font-bold text-base text-slate-900">{business.name}</div>
                <div className="text-slate-500 text-[11px]">{business.address}</div>
                <div className="text-slate-500 text-[11px]">Phone: {business.phone}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">Karigar</span>
                  <span className="font-bold text-slate-900">{karigar.name}</span>
                  {karigar.phone && <div className="text-slate-500 text-[11px]">{karigar.phone}</div>}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">As of Date</span>
                  <span className="font-bold text-slate-900">
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Financial Calculation Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Pending</span>
                  <span className="font-bold text-amber-950 font-mono text-sm">
                    ₹{parseFloat(summary.totalPendingAdvance).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Given</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    ₹{parseFloat(summary.totalAdvanceGiven).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Settled</span>
                  <span className="font-bold text-emerald-950 font-mono text-sm">
                    ₹{parseFloat(summary.totalAdvanceReceived).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">Salary</span>
                  <span className="font-bold text-purple-950 font-mono text-sm">
                    ₹{parseFloat(summary.totalSalaryPaid).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Vouchers list */}
              <div>
                <div className="font-bold text-slate-900 mb-2">Voucher Ledger Breakdown</div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {cashEntries.map((e) => (
                    <div
                      key={e.id}
                      className="p-2 rounded border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-slate-900 mr-2">{e.entryNumber}</span>
                        <span className="text-slate-500 mr-2">
                          {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-slate-400">
                          {e.category === 'SALARY' ? 'Salary' : e.status === 'RECEIVED' ? 'Settled' : 'Advance'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        ₹{parseFloat(e.amount).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const text = generateStatementWhatsAppText();
                  navigator.clipboard.writeText(text);
                  setCopiedStatement(true);
                  setTimeout(() => setCopiedStatement(false), 2000);
                }}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                {copiedStatement ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStatement ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleShareStatementWhatsApp}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Karigar */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Edit Karigar Details</span>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateKarigar} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Karigar Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Salary (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-slate-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 10000"
                      value={editSalary}
                      onChange={(e) => setEditSalary(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={editJoiningDate}
                    onChange={(e) => setEditJoiningDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Karigar Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Delete Karigar</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{karigar.name}</strong>?
              All vouchers and records for this karigar will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
