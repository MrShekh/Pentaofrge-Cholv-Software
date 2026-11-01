'use client';

import React from 'react';
import Image from 'next/image';
import { Printer, X, CheckCircle2 } from 'lucide-react';

export interface OutReceiptData {
  transactionNumber: string;
  customerName: string;
  shopName?: string | null;
  phone?: string;
  karatName: string;
  machineType?: 'HAND' | 'BIG';
  weight: string;
  date: string | Date;
  notes?: string | null;
  previousBalance?: string;
  newBalance?: string;
}

interface OutReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OutReceiptData | null;
}

export function OutReceiptModal({ isOpen, onClose, data }: OutReceiptModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(data.date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      {/* Container - hide screen wrapper when printing */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 no-print-wrapper">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Out Entry Recorded</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable 80mm Receipt Area */}
        <div className="p-4 bg-white text-slate-900 receipt-80mm" id="out-printable-slip">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-1.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-black border border-slate-300 flex items-center justify-center">
                <Image
                  src="/logo.jpg"
                  alt="A.M Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              A.M Chool
            </h1>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
              Cutting &amp; Delivery Slip
            </p>
          </div>

          {/* Meta Info */}
          <div className="py-2.5 text-xs border-b border-dashed border-slate-200 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase font-bold text-slate-400">Slip No:</span>
              <span className="font-mono font-bold text-slate-800 text-[11px]">{data.transactionNumber}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase font-bold text-slate-400">Date &amp; Time:</span>
              <span className="font-mono text-slate-700 text-[11px]">{formattedDate}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] uppercase font-bold text-slate-400">Machine:</span>
              <span className="font-semibold text-slate-900 text-[11px]">
                {data.machineType === 'BIG' ? 'Big Machine (Boro)' : 'Hand Machine'}
              </span>
            </div>
          </div>

          {/* Customer & Karat */}
          <div className="py-2.5 border-b border-dashed border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Customer:</div>
            <div className="font-bold text-sm text-slate-900">{data.customerName}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
              <span className="font-bold text-slate-700 font-mono">{data.karatName}</span>
              {data.shopName && <span>• {data.shopName}</span>}
              {data.phone && <span>• {data.phone}</span>}
            </div>
          </div>

          {/* Out Weight Main Block */}
          <div className="my-3 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
              Delivered / Out Weight
            </div>
            <div className="text-2xl font-black font-mono text-blue-600 tracking-tight mt-0.5">
              {data.weight} g
            </div>
          </div>

          {/* Order Remark if present */}
          {data.notes && (
            <div className="py-2 px-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 mb-2.5">
              <span className="font-bold text-slate-800">Order / Remark:</span> {data.notes}
            </div>
          )}

          {/* Remaining Balance Summary */}
          {(data.previousBalance !== undefined || data.newBalance !== undefined) && (
            <div className="py-2 border-t border-dashed border-slate-200 text-xs space-y-1">
              {data.previousBalance !== undefined && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Previous Balance:</span>
                  <span className="font-mono">{data.previousBalance} g</span>
                </div>
              )}
              {data.newBalance !== undefined && (
                <div className="flex justify-between font-bold text-slate-900 text-xs pt-0.5 border-t border-slate-100">
                  <span>Current Remaining:</span>
                  <span className="font-mono text-slate-900">{data.newBalance} g</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2.5 text-[10px] text-slate-400 border-t border-dashed border-slate-300 mt-1">
            Thank you! • A.M Chool
          </div>
        </div>

        {/* Action Button inside modal footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Slip (80mm)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

