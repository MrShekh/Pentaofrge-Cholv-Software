'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Plus, Trash2, AlertCircle } from 'lucide-react';

interface Karat {
  id: string;
  name: string;
  value: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [karats, setKarats] = useState<Karat[]>([]);

  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Opening balances by karat
  const [openingBalances, setOpeningBalances] = useState<
    Array<{ karatId: string; weight: string }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/karats')
      .then((res) => res.json())
      .then((data) => {
        if (data.karats) setKarats(data.karats);
      })
      .catch(console.error);
  }, []);

  const handleAddOpeningBalanceRow = () => {
    if (karats.length === 0) return;
    setOpeningBalances([...openingBalances, { karatId: karats[0].id, weight: '' }]);
  };

  const handleRemoveOpeningBalanceRow = (idx: number) => {
    setOpeningBalances(openingBalances.filter((_, i) => i !== idx));
  };

  const handleRowKaratChange = (idx: number, karatId: string) => {
    const updated = [...openingBalances];
    updated[idx].karatId = karatId;
    setOpeningBalances(updated);
  };

  const handleRowWeightChange = (idx: number, weight: string) => {
    const updated = [...openingBalances];
    updated[idx].weight = weight;
    setOpeningBalances(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMessage('Customer Name and Phone number are required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const validOpening = openingBalances
        .filter((ob) => parseFloat(ob.weight) > 0)
        .map((ob) => ({ karatId: ob.karatId, weight: parseFloat(ob.weight) }));

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          shopName: shopName.trim() || null,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          address: address.trim() || null,
          gstNumber: gstNumber.trim() || null,
          notes: notes.trim() || null,
          openingBalances: validOpening,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      router.push(`/customers/${data.customer.id}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-700" /> Add New Customer
          </h1>
          <p className="text-xs text-slate-500">
            Register client and optionally record existing pending gold opening balances
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Customer Primary Details */}
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
            1. Client & Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Jewellers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Shop / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Jewellers Pvt Ltd"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98250 11223"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="Leave blank to use phone number"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Shop / City Address
              </label>
              <input
                type="text"
                placeholder="e.g. Palace Road, Soni Bazaar, Rajkot"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 24AABCR1234F1Z8"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Internal Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Regular bangle cutting client"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 18: Opening Balances by Karat */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                2. Opening Gold Balances (Optional)
              </h2>
              <p className="text-[11px] text-slate-500">
                If migrating existing customer who already has pending gold with you
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddOpeningBalanceRow}
              className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Karat Balance
            </button>
          </div>

          {openingBalances.length > 0 ? (
            <div className="space-y-2">
              {openingBalances.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <select
                    value={row.karatId}
                    onChange={(e) => handleRowKaratChange(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    {karats.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.value}% Gold)
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="e.g. 120.000"
                      value={row.weight}
                      onChange={(e) => handleRowWeightChange(idx, e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold pr-7"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-semibold">g</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOpeningBalanceRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No opening balance. Account will start at 0.000g.
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href="/customers"
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save & Register Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
