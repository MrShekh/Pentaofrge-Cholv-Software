'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

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
      {/* Action Bar (Hidden when printing) */}
      <div className="flex items-center justify-between no-print gap-4">
        <Link
          href="/settlements"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Settlements
        </Link>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Receipt (A4)</span>
        </button>
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

        {/* Gold Summary */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            Workshop Gold Weight Summary
          </h4>
          <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-slate-50">
                <td className="py-2.5 px-4 text-slate-600">Total Received (IN)</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                  {settlement.totalInWeight} g
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-600">Finished Work Returned (OUT)</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                  {settlement.totalOutWeight} g
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="py-2.5 px-4 text-slate-900">Loss / Difference (IN − OUT)</td>
                <td className="py-2.5 px-4 text-right font-mono text-base text-slate-950">
                  {settlement.remainingBefore} g
                </td>
              </tr>

              {parseFloat(settlement.chargeableWeight) > 0 && (
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">
                    <div>Less: Making Charge Deducted in Gold</div>
                    {parseFloat(settlement.makingRate) > 0 && (
                      <div className="text-[11px] text-amber-800 font-medium">
                        Rate: {settlement.makingRate}/100g on {parseFloat(settlement.totalOutWeight) > 0 ? settlement.totalOutWeight : settlement.totalInWeight}g order
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-800">
                    −{settlement.chargeableWeight} g
                  </td>
                </tr>
              )}
              {parseFloat(settlement.dukanLossWeight || '0') > 0 && (
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">
                    <div>Less: Dukan Loss (Shop Loss / Melting Wastage)</div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-red-700">
                    −{settlement.dukanLossWeight} g
                  </td>
                </tr>
              )}
              {parseFloat(settlement.dollLossWeight || '0') > 0 && (
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">
                    <div>Less: Doll Loss (ढोल नुकसान / Doll Loss)</div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                    −{settlement.dollLossWeight} g
                  </td>
                </tr>
              )}
              <tr className="bg-emerald-50/50">
                <td className="py-2.5 px-4 text-emerald-950 font-bold">Remaining Gold Returned to Customer</td>
                <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800">
                  {settlement.returnedGoldWeight ||
                    Math.max(
                      0,
                      parseFloat(settlement.settledWeight) -
                        parseFloat(settlement.chargeableWeight || '0') -
                        parseFloat(settlement.dukanLossWeight || '0') -
                        parseFloat(settlement.dollLossWeight || '0')
                    ).toFixed(3)}{' '}
                  g
                </td>
              </tr>

              <tr className="bg-amber-50/60 font-black">
                <td className="py-3 px-4 text-amber-950 uppercase tracking-wider">
                  Closing Ledger Balance
                </td>
                <td className="py-3 px-4 text-right font-mono text-base text-amber-950">
                  {settlement.carryForwardWeight} g
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

        {/* Footer Signature Blocks */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="w-48 mx-auto border-t border-slate-400 pt-2 font-bold text-slate-800">
              Customer Signature
            </div>
          </div>

          <div>
            <div className="w-48 mx-auto border-t border-slate-400 pt-2 font-bold text-slate-800">
              Authorized Signature
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">({business.name})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
