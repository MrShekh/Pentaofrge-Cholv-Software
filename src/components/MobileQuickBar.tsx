'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Minus, Scale } from 'lucide-react';
import { TransactionType } from '@prisma/client';

interface MobileQuickBarProps {
  onOpenQuickTx: (type: TransactionType) => void;
}

export function MobileQuickBar({ onOpenQuickTx }: MobileQuickBarProps) {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-lg no-print">
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        <button
          onClick={() => onOpenQuickTx(TransactionType.IN)}
          className="flex flex-col items-center justify-center py-2 px-1 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl shadow-xs transition"
        >
          <div className="flex items-center gap-1 text-sm font-bold">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ IN</span>
          </div>
          <span className="text-[10px] text-emerald-100">Receive</span>
        </button>

        <button
          onClick={() => onOpenQuickTx(TransactionType.OUT)}
          className="flex flex-col items-center justify-center py-2 px-1 bg-blue-600 active:bg-blue-700 text-white rounded-xl shadow-xs transition"
        >
          <div className="flex items-center gap-1 text-sm font-bold">
            <Minus className="w-4 h-4 stroke-[3]" />
            <span>− OUT</span>
          </div>
          <span className="text-[10px] text-blue-100">Return</span>
        </button>

        <Link
          href="/settlements"
          className="flex flex-col items-center justify-center py-2 px-1 bg-slate-900 active:bg-slate-800 text-white rounded-xl shadow-xs transition"
        >
          <div className="flex items-center gap-1 text-sm font-bold">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Settle</span>
          </div>
          <span className="text-[10px] text-slate-300">Account</span>
        </Link>
      </div>
    </div>
  );
}
