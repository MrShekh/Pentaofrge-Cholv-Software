'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Download, CheckCircle, IndianRupee } from 'lucide-react';

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

  // Additional payment input state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayMode, setNewPayMode] = useState('CASH');
  const [newPayRef, setNewPayRef] = useState('');
  const [isRecordingPay, setIsRecordingPay] = useState(false);

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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayAmount || parseFloat(newPayAmount) <= 0) return;

    setIsRecordingPay(true);
    try {
      const res = await fetch(`/api/settlements/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newPayAmount),
          paymentMode: newPayMode,
          referenceNo: newPayRef,
        }),
      });

      if (!res.ok) throw new Error('Payment failed');
      setShowAddPayment(false);
      setNewPayAmount('');
      fetchReceipt();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecordingPay(false);
    }
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

        <div className="flex items-center gap-2">
          {parseFloat(settlement.pendingAmount) > 0 && (
            <button
              onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <IndianRupee className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt (A4)</span>
          </button>
        </div>
      </div>

      {/* Record Payment Drawer / Form */}
      {showAddPayment && (
        <form
          onSubmit={handleRecordPayment}
          className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-900 uppercase">
              Record Additional Payment for {settlement.settlementNumber}
            </h3>
            <button
              type="button"
              onClick={() => setShowAddPayment(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Amount (Pending: ₹{settlement.pendingAmount})
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max={parseFloat(settlement.pendingAmount)}
                required
                value={newPayAmount}
                onChange={(e) => setNewPayAmount(e.target.value)}
                placeholder="₹ Amount"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Mode</label>
              <select
                value={newPayMode}
                onChange={(e) => setNewPayMode(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Reference #</label>
              <input
                type="text"
                value={newPayRef}
                onChange={(e) => setNewPayRef(e.target.value)}
                placeholder="Optional Ref / UTR"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isRecordingPay}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs"
          >
            {isRecordingPay ? 'Recording...' : 'Save Payment'}
          </button>
        </form>
      )}

      {/* Professional A4 Printable Settlement Receipt (Section 13) */}
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
              Receipt No: <strong className="font-mono text-slate-800">{settlement.settlementNumber}</strong>
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

        {/* Customer & Karat Details */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Customer</div>
            <div className="text-sm font-bold text-slate-900">{settlement.customer.name}</div>
            {settlement.customer.shopName && (
              <div className="text-slate-600">{settlement.customer.shopName}</div>
            )}
            <div className="text-slate-500 mt-1">{settlement.customer.phone}</div>
            {settlement.customer.address && (
              <div className="text-slate-500">{settlement.customer.address}</div>
            )}
          </div>

          <div className="text-right space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Karat Account</div>
            <div className="text-sm font-black text-amber-900 font-mono">
              {settlement.karat.name} ({settlement.karat.value}% Purity)
            </div>
            <div className="text-slate-500 text-[11px]">
              Created by: {settlement.createdBy.name}
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

              {/* If settled in Gold with making deducted */}
              {/* If settled in Gold with making deducted or dukan loss */}
              {parseFloat(settlement.finalMakingAmount) === 0 &&
              (parseFloat(settlement.chargeableWeight) > 0 || parseFloat(settlement.dukanLossWeight || '0') > 0) ? (
                <>
                  {parseFloat(settlement.chargeableWeight) > 0 && (
                    <tr>
                      <td className="py-2.5 px-4 text-slate-600">
                        <div>Less: Making Charge Deducted in Gold (Kept by Workshop)</div>
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
                        <div className="text-[11px] text-slate-500">Workshop burning and manufacturing loss</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-red-700">
                        −{settlement.dukanLossWeight} g
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
                            parseFloat(settlement.dukanLossWeight || '0')
                        ).toFixed(3)}{' '}
                      g
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="py-2.5 px-4 text-slate-600">Gold Returned to Customer</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                    {settlement.returnedGoldWeight ||
                      Math.max(
                        0,
                        parseFloat(settlement.settledWeight) -
                          parseFloat(settlement.dukanLossWeight || '0')
                      ).toFixed(3)}{' '}
                    g
                  </td>
                </tr>
              )}

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

        {/* Settlement Settlement & Making Charges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Settlement Method & Making */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1">
              Settlement Method
            </h4>
            {parseFloat(settlement.finalMakingAmount) === 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Mode:</span>
                  <span className="font-bold text-slate-900">🪙 Settled in Gold</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Making Charge (Gold):</span>
                  <span className="font-mono font-bold text-amber-800">
                    {settlement.chargeableWeight} g
                  </span>
                </div>
                {parseFloat(settlement.dukanLossWeight || '0') > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Dukan Loss:</span>
                    <span className="font-mono font-bold text-red-700">
                      {settlement.dukanLossWeight} g
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Gold Returned:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {settlement.returnedGoldWeight ||
                      Math.max(
                        0,
                        parseFloat(settlement.settledWeight) -
                          parseFloat(settlement.chargeableWeight || '0') -
                          parseFloat(settlement.dukanLossWeight || '0')
                      ).toFixed(3)}{' '}
                    g
                  </span>
                </div>
                {parseFloat(settlement.makingRate) > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Making Rate:</span>
                    <span className="font-mono font-bold text-amber-900">
                      {settlement.makingRate} / 100g
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 pt-1">
                  Making charge was deducted directly from the loss/scrap gold. No cash payable.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Mode:</span>
                  <span className="font-bold text-slate-900">💵 Settled in Money</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Making Charge:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{settlement.finalMakingAmount}
                  </span>
                </div>
                {parseFloat(settlement.makingRate) > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Making Rate:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹{settlement.makingRate} / g
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 pt-1">
                  Gold returned to customer and making charge settled in rupees.
                </p>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1">
                Payment Status
              </h4>
              {parseFloat(settlement.finalMakingAmount) === 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      PAID (IN GOLD)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Cash Balance:</span>
                    <span className="font-mono font-bold text-emerald-700">₹0.00</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Total Billed:</span>
                    <span className="font-mono font-bold text-slate-900">₹{settlement.finalMakingAmount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Paid Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{settlement.paidAmount}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Pending Balance:</span>
                    <span
                      className={`font-mono font-bold ${
                        parseFloat(settlement.pendingAmount) > 0 ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      ₹{settlement.pendingAmount}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Payment Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        settlement.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : settlement.paymentStatus === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {settlement.paymentStatus}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {settlement.notes && (
              <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 italic">
                {settlement.notes}
              </div>
            )}
          </div>
        </div>

        {/* Footer Signature Blocks (Section 13) */}
        <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="w-48 mx-auto border-t border-slate-400 pt-2 font-bold text-slate-800">
              Customer Signature
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">({settlement.customer.name})</div>
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
