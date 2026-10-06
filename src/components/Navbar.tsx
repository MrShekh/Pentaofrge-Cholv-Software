'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Search, LogOut, User } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  user: { name: string; username: string; role: string } | null;
}

export function Navbar({ onToggleSidebar, user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [globalSearch, setGlobalSearch] = useState('');

  if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return null;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      router.push(`/customers?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 no-print">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Left: Mobile hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline text-xs font-medium text-slate-500">
              Gold Cutting &amp; Engraving Workshop Ledger
            </span>
          </div>

          {/* Right: Search and User */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer, phone..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
              />
            </form>

            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-600">
                <span className="font-medium text-slate-800">{user.name}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  ({user.role})
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition ml-1"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
