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
  KeyRound,
  Edit3,
  Lock,
  X,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'profile' | 'karats' | 'users' | 'audit'>('business');

  // Logged-in admin profile state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

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

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCurrentUser = () => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setCurrentUser(d.user);
          setProfileName(d.user.name || '');
          setProfileEmail(d.user.email || '');
        }
      })
      .catch(console.error);
  };

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
    fetchCurrentUser();
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (profileNewPassword) {
      if (profileNewPassword.length < 6) {
        setErrorMessage('Password must be at least 6 characters long');
        return;
      }
      if (profileNewPassword !== profileConfirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }
    }

    if (!currentUser?.id) {
      setErrorMessage('User session not loaded');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await fetch(`/api/settings/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          password: profileNewPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileNewPassword('');
      setProfileConfirmPassword('');
      notify('Your profile and password updated successfully');
      fetchCurrentUser();
      fetchUsers();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditRole(user.role);
    setErrorMessage(null);
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMessage(null);

    if (editPassword && editPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long');
      return;
    }

    setIsSavingUserEdit(true);
    try {
      const res = await fetch(`/api/settings/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setEditingUser(null);
      notify(`User ${editingUser.username} updated successfully`);
      fetchUsers();
      if (editingUser.id === currentUser?.id) {
        fetchCurrentUser();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setIsSavingUserEdit(false);
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
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'business'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" /> Business Profile
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" /> My Profile &amp; Password
        </button>

        <button
          onClick={() => setActiveTab('karats')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'karats'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" /> Karat Grades
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UsersIcon className="w-4 h-4" /> Staff &amp; Access
        </button>

        <button
          onClick={() => {
            setActiveTab('audit');
            fetchAudit();
          }}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
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
                Business / Workshop Name
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
                placeholder="e.g. Your Name (Proprietor)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white"
              />
              <span className="text-[11px] text-slate-400">Change Kishorebhai to your own name</span>
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

      {/* Tab 2: My Profile & Password */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-2xl"
        >
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-700" />
              Admin Profile &amp; Password Settings
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Update your display name (e.g. change Kishorebhai to your own name) and set your private login password.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  disabled
                  value={currentUser?.username || 'admin'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-mono cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400">Fixed login username</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Your Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Your Name (Admin)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                />
                <span className="text-[11px] text-slate-400">Replaces Kishorebhai on top header &amp; logs</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Change Password (Leave blank to keep current)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isUpdatingProfile ? 'Saving...' : 'Save Profile & Password'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Karat Grades (Section 3) */}
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded text-[10px] font-bold flex items-center gap-1 transition"
                          title="Edit user or reset password"
                        >
                          <Edit3 className="w-3 h-3" /> Edit / Password
                        </button>
                        <button
                          onClick={() => handleToggleUserActive(u)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 transition"
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
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

      {/* Edit User & Reset Password Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-700" />
                  Edit User &amp; Password
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  @{editingUser.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Full Name / Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'ADMIN' | 'STAFF')}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white"
                >
                  <option value="STAFF">Staff (Operator)</option>
                  <option value="ADMIN">Admin (Full Control)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserEdit}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSavingUserEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
