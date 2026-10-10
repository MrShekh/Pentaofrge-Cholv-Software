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

  const basisLabel =
    settlement.chargeBasis === 'TOTAL_RECEIVED'
      ? 'Received Weight'
      : settlement.chargeBasis === 'FINISHED_OUT'
      ? 'Finished OUT Weight'
      : 'Manual Chargeable Weight';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-emerald-700 animate-in fade-in slide-in-from-top-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Action Bar (Hidden when printing) */}
      <div className="flex items-center justify-between no-print gap-4">
        <Link
          href="/settlements"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settlements
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-700" />
            <span>Edit Settlement</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt (A4)</span>
          </button>
        </div>
      </div>

      {/* Professional A4 Printable Settlement Receipt */}
      <div className="print-page bg-white rounded-2xl border border-slate-200 shadow-md p-8 md:p-12 text-slate-900 font-sans space-y-6">
        {/* Header */}
        <div className="text-center space-y-1 pb-6 border-b border-slate-200">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            {business.name}
          </h2>
          <p className="text-xs text-slate-600">{business.address}</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-medium">
            <span>Phone: {business.phone}</span>
            {business.whatsapp && <span>WhatsApp: {business.whatsapp}</span>}
            {business.gstNumber && <span className="font-mono">GST: {business.gstNumber}</span>}
          </div>
        </div>

        {/* Title & Receipt Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              Chool / Cutting Work Settlement
            </h3>
            <span className="text-xs text-slate-500">
              Receipt No: <strong className="font-mono text-slate-800">{settlement.settlementNumber}</strong> • Karat: <strong className="text-amber-900 font-mono">{settlement.karat.name}</strong>
            </span>
          </div>

          <div className="text-left sm:text-right text-xs space-y-0.5">
            <div>
              <span className="text-slate-500">Date:</span>{' '}
              <strong className="font-mono">{settleDateStr}</strong>
            </div>
            <div>
              <span className="text-slate-500">Period:</span>{' '}
              <strong className="font-mono">{fromDateStr} – {toDateStr}</strong>
            </div>
          </div>
        </div>

        {/* Gold Summary: Only In Total, Making Charge, and Return to Customer */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            Settlement Gold Summary
          </h4>
          <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-700">In Total</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-base text-slate-900">
                  {settlement.totalInWeight} g
                </td>
              </tr>

              <tr>
                <td className="py-3 px-4 text-slate-700">
                  <div className="font-bold">Making Charge</div>
                  {parseFloat(settlement.makingRate) > 0 && (
                    <div className="text-[11px] text-slate-400">
                      Rate: {settlement.makingRate}/100g
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                  {settlement.chargeableWeight} g
                </td>
              </tr>

              <tr className="bg-emerald-50/60 font-bold">
                <td className="py-3.5 px-4 text-emerald-950 font-black">Return to Customer</td>
                <td className="py-3.5 px-4 text-right font-mono font-black text-lg text-emerald-800">
                  {settlement.returnedGoldWeight ||
                    Math.max(
                      0,
                      parseFloat(settlement.settledWeight) -
                        parseFloat(settlement.chargeableWeight || '0')
                    ).toFixed(3)}{' '}
                  g
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Remark / Notes */}
        {settlement.notes && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <span className="font-bold text-slate-900">Remark / Notes: </span>
            <span>{settlement.notes}</span>
          </div>
        )}
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
