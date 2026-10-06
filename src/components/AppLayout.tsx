'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileQuickBar } from './MobileQuickBar';
import { QuickTransactionModal } from './QuickTransactionModal';
import { TransactionType } from '@prisma/client';
import { CheckCircle2 } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; username: string; role: string } | null>(null);

  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [quickTxType, setQuickTxType] = useState<TransactionType>(TransactionType.IN);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else if (!isAuthPage) {
          router.push('/login');
        }
      })
      .catch(() => {});
  }, [pathname, router, isAuthPage]);

  const handleOpenQuickTx = (type: TransactionType) => {
    setQuickTxType(type);
    setQuickTxOpen(true);
  };

  const handleSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
    window.dispatchEvent(new Event('transaction-updated'));
  };

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-100">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex">
      {/* Clean minimalist sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-60 min-w-0 transition-all duration-200">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          user={user}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-20 md:pb-8">
          {children}
        </main>

        <MobileQuickBar onOpenQuickTx={handleOpenQuickTx} />
      </div>

      {/* Quick Transaction Entry Modal */}
      <QuickTransactionModal
        isOpen={quickTxOpen}
        onClose={() => setQuickTxOpen(false)}
        onSuccess={handleSuccess}
        initialType={quickTxType}
      />

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2.5 p-3.5 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-700 max-w-md animate-in fade-in slide-in-from-top-3 duration-200 no-print text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}
    </div>
  );
}
