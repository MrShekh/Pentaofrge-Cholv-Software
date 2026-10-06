'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Layers,
  Users as UsersIcon,
  ShieldCheck,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  FileClock,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'karats' | 'users' | 'audit'>('business');

  // Business state
  const [business, setBusiness] = useState<any>({
    name: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    gstNumber: '',
  });

  // Karats state
  const [karats, setKarats] = useState<any[]>([]);
  const [showAddKarat, setShowAddKarat] = useState(false);
  const [newKaratName, setNewKaratName] = useState('');
  const [newKaratValue, setNewKaratValue] = useState('');
  const [newKaratDesc, setNewKaratDesc] = useState('');
  const [newKaratRate, setNewKaratRate] = useState('25');

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('STAFF');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBusiness = () => {
    fetch('/api/settings/business')
      .then((r) => r.json())
      .then((d) => d.business && setBusiness(d.business))
      .catch(console.error);
  };

  const fetchKarats = () => {
    fetch('/api/settings/karats')
      .then((r) => r.json())
      .then((d) => d.karats && setKarats(d.karats))
      .catch(console.error);
  };

  const fetchUsers = () => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then((d) => d.users && setUsers(d.users))
      .catch(console.error);
  };

  const fetchAudit = () => {
    fetch('/api/settings/audit-logs')
      .then((r) => r.json())
      .then((d) => d.logs && setAuditLogs(d.logs))
      .catch(console.error);
  };

  useEffect(() => {
    fetchBusiness();
    fetchKarats();
    fetchUsers();
    fetchAudit();
  }, []);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(business),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update business');
      notify('Business profile updated successfully');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKarat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await fetch('/api/settings/karats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKaratName,
          value: parseFloat(newKaratValue),
          purityDescription: newKaratDesc,
          defaultMakingRate: parseFloat(newKaratRate) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create karat');
      setShowAddKarat(false);
      setNewKaratName('');
      setNewKaratValue('');
      setNewKaratDesc('');
      notify('New Karat grade created');
      fetchKarats();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating karat');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setShowAddUser(false);
      setNewUsername('');
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      notify('New user account added');
      fetchUsers();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating user');
    }
  };

  const handleToggleUserActive = async (user: any) => {
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      notify(`User ${user.username} status updated`);
      fetchUsers();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-amber-700" />
          Settings & Administration
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Manage business profile, custom karat grades, staff logins, and audit compliance
        </p>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'business'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" /> Business Profile
        </button>

        <button
          onClick={() => setActiveTab('karats')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'karats'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> Karat Grades (Ledger Separation)
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'users'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UsersIcon className="w-4 h-4" /> Staff & Access
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            fetchAudit();
          }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileClock className="w-4 h-4" /> Audit Logs
        </button>
      </div>

      {/* Tab 1: Business Profile */}
      {activeTab === 'business' && (
        <form
          onSubmit={handleSaveBusiness}
          className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-3xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Business Name
              </label>
              <input
                type="text"
                required
                value={business.name || ''}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Owner / Proprietor Name
              </label>
              <input
                type="text"
                required
                value={business.ownerName || ''}
                onChange={(e) => setBusiness({ ...business, ownerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Primary Phone Number
              </label>
              <input
                type="text"
                required
                value={business.phone || ''}
                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={business.whatsapp || ''}
                onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Workshop / Shop Address
              </label>
              <input
                type="text"
                required
                value={business.address || ''}
                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                GST Number
              </label>
              <input
                type="text"
                value={business.gstNumber || ''}
                onChange={(e) => setBusiness({ ...business, gstNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={business.email || ''}
                onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Karat Grades (Section 3) */}
      {activeTab === 'karats' && (
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configured Karats</h2>
              <p className="text-xs text-slate-500">
                Each karat creates an independent running gold ledger for every customer
              </p>
            </div>
            <button
              onClick={() => setShowAddKarat(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Add Custom Karat
            </button>
          </div>

          {showAddKarat && (
            <form
              onSubmit={handleAddKarat}
              className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase">
                  Add New Karat Grade (e.g. 91.6, 58.5)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddKarat(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Karat Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 91.6K or 92K"
                    value={newKaratName}
                    onChange={(e) => setNewKaratName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Purity Value (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    required
                    placeholder="e.g. 91.60"
                    value={newKaratValue}
                    onChange={(e) => setNewKaratValue(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Default Making Rate (₹/g)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newKaratRate}
                    onChange={(e) => setNewKaratRate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hallmark gold"
                    value={newKaratDesc}
                    onChange={(e) => setNewKaratDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Save Karat Grade
              </button>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Karat Name</th>
                  <th className="py-3 px-3">Gold Purity (%)</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-3">Default Rate</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {karats.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-black text-amber-900 font-mono text-sm">
                      {k.name}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{k.value}%</td>
                    <td className="py-3 px-4 text-slate-600">{k.purityDescription || '—'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      ₹{k.defaultMakingRate} / g
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Users (Section 21) */}
      {activeTab === 'users' && (
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">User Management (RBAC)</h2>
              <p className="text-xs text-slate-500">
                Admin: full access • Staff: enter IN/OUT & print statements only
              </p>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {showAddUser && (
            <form
              onSubmit={handleAddUser}
              className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase">
                  Add User Account
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mahesh"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahesh Patel"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@pentachool.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="STAFF">Staff (Operator)</option>
                    <option value="ADMIN">Admin (Full Control)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Create Account
              </button>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{u.username}</td>
                    <td className="py-3 px-4 text-slate-500">{u.email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleUserActive(u)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs (Section 20) */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">System Audit Trail</h2>
            <span className="text-xs text-slate-400 font-mono">
              Immutable action log for compliance
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">User</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Entity</th>
                  <th className="py-3 px-4">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {log.username || log.user?.name || 'System'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'CREATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'VOID'
                              ? 'bg-red-100 text-red-800'
                              : log.action === 'SETTLE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{log.entity}</td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-sm truncate">
                        {log.reason || log.newValue || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No audit entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
