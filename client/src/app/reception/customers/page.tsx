'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import { useBranch } from '../../../hooks/useBranch';
import { CustomerDTO } from '@goldscope/types';
import { formatIndianDateDisplay } from '@goldscope/shared';
import { Users, Search, Phone, Plus, RefreshCw, Building2 } from 'lucide-react';

export default function CustomersPage() {
  const { branchFilterQuery, currentBranchLabel, isAdmin } = useBranch();
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      if (searchQuery.trim()) {
        const results = await api.searchCustomers(searchQuery.trim(), branchFilterQuery);
        setCustomers(results);
      } else {
        const list = await api.listCustomers(100, branchFilterQuery);
        setCustomers(list);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, branchFilterQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await api.createCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        notes: newNotes.trim() || undefined,
      });
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      fetchCustomers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to register customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold-400 text-xs uppercase tracking-widest font-mono font-semibold">
            <Users className="w-4 h-4" />
            <span>Master Directory</span>
            {isAdmin && (
              <span className="bg-gold-500/15 border border-gold-500/30 text-gold-300 text-[10px] px-2 py-0.5 rounded-md font-sans font-bold normal-case">
                Branch: {currentBranchLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Registered Customers & Jewellers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Persistent customer database with normalized WhatsApp contact numbers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2.5 px-4 gold-button rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Jeweller Name or Phone..."
            className="w-full bg-obsidian-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
          />
        </div>

        <button
          onClick={fetchCustomers}
          className="p-2 rounded-xl bg-obsidian-850 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gold-400 mb-3" />
            <p className="text-sm">Loading customer directory...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full glass-panel py-16 text-center rounded-2xl border border-slate-800">
            <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No customers found</p>
            <p className="text-xs text-slate-500 mt-1">Add your first jeweller or customer to the directory.</p>
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-gold-500/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-slate-100">{c.name}</h3>
                  <span className="text-[10px] font-mono text-slate-500 bg-obsidian-900 px-2 py-0.5 rounded border border-slate-800">
                    ID: {c.id.slice(-6)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gold-400 mt-2 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{c.phone}</span>
                </div>

                {c.notes && (
                  <p className="text-xs text-slate-400 mt-3 p-2 rounded-lg bg-obsidian-900/60 border border-slate-800/50">
                    {c.notes}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-800/60 flex justify-between">
                <span>Registered:</span>
                <span>{formatIndianDateDisplay(c.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gold-500/30 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-gold-400" />
              <span>Register New Customer / M/s</span>
            </h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Customer / Jeweller Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Royal Jewellers"
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  WhatsApp Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Notes / Location (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Wholesale counter, Zaveri Bazaar"
                  className="w-full bg-obsidian-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-4 bg-obsidian-850 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 gold-button rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
