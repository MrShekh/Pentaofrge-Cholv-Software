'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (type: 'admin' | 'staff') => {
    if (type === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
    } else {
      setIdentifier('staff');
      setPassword('staff123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 font-black text-2xl shadow-inner">
            Ch
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Penta Chool Works
          </h1>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-widest">
            Jewellery Gold Cutting & Engraving Ledger
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin or admin@pentachool.com"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold transition"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In to Ledger'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Fill */}
        <div className="pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2.5">
            Quick Demo Fill
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition text-center"
            >
              Demo Admin (Full)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('staff')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition text-center"
            >
              Demo Staff (Operator)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
