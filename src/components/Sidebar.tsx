'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  Scale,
  Banknote,
  Cog,
  FileSpreadsheet,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; username: string; role: string } | null;
}

export function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return null;
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/transactions', label: 'Transactions', icon: ReceiptText },
    { href: '/settlements', label: 'Settlements', icon: Scale },
    { href: '/boro-machine', label: 'Boro Machine', icon: Cog },
    { href: '/karigar-cash', label: 'Karigar Cash', icon: Banknote },
    { href: '/reports', label: 'Reports', icon: FileSpreadsheet },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container: Clean, Minimal, Light Neutral */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
            <Link href="/" onClick={onClose} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-200/60 shadow-xs flex items-center justify-center">
                <Image
                  src="/logo.jpg"
                  alt="A.M Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="leading-tight">
                <span className="block font-bold text-slate-900 text-sm tracking-tight">
                  A.M Chool
                </span>
                <span className="block text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                  Cutting Ledger
                </span>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-0.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${isActive
                      ? 'bg-slate-100 text-slate-950 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-900 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'
                      }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-100">
          {user && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs">
              <div className="overflow-hidden pr-2">
                <div className="font-semibold text-slate-800 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  {user.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
