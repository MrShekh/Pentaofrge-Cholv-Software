'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Pencil, CheckCircle2 } from 'lucide-react';
import { EditSettlementModal } from '@/components/EditSettlementModal';

interface SettlementDetail {
  id: string;
  settlementNumber: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    shopName: string | null;
    phone: string;
    address: string | null;
    gstNumber: string | null;
  };
  karatId: string;
  karat: {
    name: string;
    value: string;
  };
  fromDate: string;
  toDate: string;
  settlementDate: string;
  totalInWeight: string;
  totalOutWeight: string;
  remainingBefore: string;
  settlementAction: string;
  settledWeight: string;
  returnedGoldWeight?: string;
  makingGoldWeight?: string;
  dukanLossWeight?: string;
  dollLossWeight?: string;
  carryForwardWeight: string;
  finalRemainingBalance: string;
  makingRate: string;
  chargeBasis: string;
  chargeableWeight: string;
  calculatedMakingAmount: string;
  discount: string;
  extraCharge: string;
  finalMakingAmount: string;
  paymentStatus: string;
  paidAmount: string;
  pendingAmount: string;
  notes: string | null;
  createdBy: { name: string; username: string };
  payments: Array<{
    id: string;
    amount: string;
    paymentDate: string;
    paymentMode: string;
    referenceNo: string | null;
  }>;
  transactions?: Array<{
    id: string;
    transactionNumber: string;
    type: string;
    weight: string;
    notes?: string | null;
    transactionDate: string;
  }>;
}

interface BusinessProfile {
  name: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  gstNumber: string | null;
}

export default function SettlementReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<{
    settlement: SettlementDetail;
    business: BusinessProfile;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReceipt = () => {
    setIsLoading(true);
    fetch(`/api/settlements/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Receipt not found');
        return res.json();
      })
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };
  if (isLoading && !data) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading settlement receipt...</div>;
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-slate-600">
        <p className="font-bold">Settlement not found</p>
        <Link href="/settlements" className="text-xs text-amber-700 underline mt-2 inline-block">
          Back to Settlements
        </Link>
      </div>
    );
  }

  const { settlement, business } = data;

  const fromDateStr = new Date(settlement.fromDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const toDateStr = new Date(settlement.toDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const settleDateStr = new Date(settlement.settlementDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
        ', ' +
        d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    } catch {
      return dateStr;
    }
  };

  const inTransactions = (settlement.transactions || []).filter(
    (t) => t.type === 'IN' || t.type === 'OPENING_BALANCE'
  );

  const outTransactions = (settlement.transactions || []).filter(
    (t) => t.type === 'OUT'
  );

  const returnTransaction = (settlement.transactions || []).find(
    (t) => t.type === 'SETTLEMENT_RETURN'
  );

  const returnGoldStr =
    settlement.returnedGoldWeight ||
    Math.max(
      0,
      parseFloat(settlement.settledWeight) -
        parseFloat(settlement.chargeableWeight || '0')
    ).toFixed(3);

  return (
    <div className="space-y-5 max-w-md mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-emerald-700 animate-in fade-in slide-in-from-top-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Action Bar (Hidden when printing) */}
      <div className="flex items-center justify-between no-print gap-3">
        <Link
          href="/settlements"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-700" />
            <span>Edit</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print (80mm)</span>
          </button>
        </div>
      </div>

      {/* Scoped Print Styles for 80mm Thermal Printer */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm 3mm;
          }
          html, body {
            width: 80mm !important;
            min-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt-80mm {
            width: 74mm !important;
            max-width: 74mm !important;
            margin: 0 auto !important;
            padding: 1mm 0 4mm 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Professional 80mm Thermal Printable Settlement Receipt */}
      <div className="receipt-80mm bg-white rounded-xl border border-slate-300 shadow-md p-4 sm:p-5 text-slate-900 font-sans space-y-3 print:p-0 print:border-none print:shadow-none">
        {/* Header: Only Main Title & Business Details */}
        <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-tight">
            {business.name}
          </h2>
          <p className="text-[11px] text-slate-600 leading-tight">{business.address}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 text-[10px] text-slate-500 font-medium">
            <span>Ph: {business.phone}</span>
            {business.whatsapp && <span>• WA: {business.whatsapp}</span>}
            {business.gstNumber && <span>• GST: {business.gstNumber}</span>}
          </div>
        </div>

        {/* Summary Table: Receive, Total, Out, Making Charge, Return to Customer with Date & Time */}
        <div>
          <table className="w-full text-xs text-left border border-slate-300 rounded-lg overflow-hidden">
            <tbody className="divide-y divide-slate-200">
              {/* Received (IN) Entries with Date & Time */}
              {inTransactions.length > 0 ? (
                inTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx} className="bg-slate-50/80">
                    <td className="py-2 px-2.5 font-bold text-slate-700">
                      <div>{inTransactions.length > 1 ? `Received (IN) #${idx + 1}` : 'Received (IN)'}</div>
                      <div className="text-[10px] font-normal text-slate-500 font-mono mt-0.5">
                        {formatDateTime(tx.transactionDate)}
                      </div>
                      {tx.notes && (
                        <div className="text-[10px] font-normal text-slate-600 mt-0.5">
                          Order: <span className="font-medium text-slate-800">{tx.notes}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                      {tx.weight} g
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="bg-slate-50/80">
                  <td className="py-2 px-2.5 font-bold text-slate-700">
                    <div>Received (IN)</div>
                    <div className="text-[10px] font-normal text-slate-500 font-mono mt-0.5">
                      {formatDateTime(settlement.fromDate || settlement.settlementDate)}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                    {settlement.totalInWeight} g
                  </td>
                </tr>
              )}

              {/* Total (Placed up immediately after Received) */}
              <tr className="bg-slate-100 font-bold border-y-2 border-slate-300">
                <td className="py-2 px-2.5 font-bold text-slate-900">
                  Total
                </td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                  {settlement.totalInWeight} g
                </td>
              </tr>

              {/* OUT Entries with Date & Time (all out entries come here after Total) */}
              {outTransactions.length > 0 ? (
                outTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx}>
                    <td className="py-2 px-2.5 text-slate-700">
                      <div className="font-bold">{outTransactions.length > 1 ? `Out #${idx + 1}` : 'Out'}</div>
                      <div className="text-[10px] font-normal text-slate-500 font-mono mt-0.5">
                        {formatDateTime(tx.transactionDate)}
                      </div>
                      {tx.notes && (
                        <div className="text-[10px] font-normal text-slate-600 mt-0.5">
                          Order: <span className="font-medium text-slate-800">{tx.notes}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-sm text-slate-800 whitespace-nowrap">
                      {tx.weight} g
                    </td>
                  </tr>
                ))
              ) : parseFloat(settlement.totalOutWeight || '0') > 0 ? (
                <tr>
                  <td className="py-2 px-2.5 text-slate-700">
                    <div className="font-bold">Out</div>
                    <div className="text-[10px] font-normal text-slate-500 font-mono mt-0.5">
                      {formatDateTime(settlement.toDate || settlement.settlementDate)}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-sm text-slate-800 whitespace-nowrap">
                    {settlement.totalOutWeight} g
                  </td>
                </tr>
              ) : null}

              {/* Making Charge */}
              <tr>
                <td className="py-2 px-2.5 text-slate-700">
                  <div className="font-bold">Making Charge</div>
                  {parseFloat(settlement.makingRate) > 0 && (
                    <div className="text-[10px] text-slate-400">
                      Rate: {settlement.makingRate}/100g
                    </div>
                  )}
                </td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-sm text-amber-800 whitespace-nowrap">
                  {parseFloat(settlement.finalMakingAmount) > 0 && parseFloat(settlement.chargeableWeight || '0') === 0
                    ? `₹${settlement.finalMakingAmount}`
                    : `${settlement.chargeableWeight} g`}
                </td>
              </tr>

              {/* Return to Customer with Date & Time */}
              <tr className="bg-emerald-50/70 border-t-2 border-emerald-600 font-bold">
                <td className="py-2.5 px-2.5 text-emerald-950 font-black">
                  <div>Return to Customer</div>
                  <div className="text-[10px] font-normal text-emerald-800 font-mono mt-0.5">
                    {formatDateTime(
                      returnTransaction?.transactionDate || settlement.settlementDate
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono font-black text-base text-emerald-900 whitespace-nowrap">
                  {returnGoldStr} g
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer for 80mm roll */}
        <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-dashed border-slate-300">
          Thank you! • {settleDateStr}
        </div>
      </div>

      <EditSettlementModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        settlement={
          settlement
            ? {
                id: settlement.id,
                settlementNumber: settlement.settlementNumber,
                customerName: settlement.customer.name,
                karatName: settlement.karat.name,
                totalInWeight: settlement.totalInWeight,
                dukanLossWeight: settlement.dukanLossWeight,
                dollLossWeight: settlement.dollLossWeight,
                makingGoldWeight: settlement.makingGoldWeight || settlement.chargeableWeight,
                returnedGoldWeight: settlement.returnedGoldWeight,
                carryForwardWeight: settlement.carryForwardWeight,
                notes: settlement.notes || undefined,
              }
            : null
        }
        onSuccess={() => {
          setToastMessage('Settlement updated successfully! Balance recalculated.');
          setTimeout(() => setToastMessage(null), 4000);
          fetchReceipt();
        }}
      />
    </div>
  );
}
