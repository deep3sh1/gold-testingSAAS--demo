'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { CustomerDTO, TestRequestDTO } from '@goldscope/types';
import { formatIndianDateDisplay, getIndianBusinessDate, normalizeIndianPhone } from '@goldscope/shared';
import { useAuth } from '../../../../hooks/useAuth';
import { useBranch, BRANCH_LIST } from '../../../../hooks/useBranch';
import {
  Sparkles,
  Calendar,
  Building2,
  Phone,
  Scale,
  Gem,
  CheckCircle,
  Hash,
  ArrowRight,
  Search,
} from 'lucide-react';

export default function NewTestRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBranch, branchFilterQuery, isAdmin } = useBranch();

  // Target branch for Admin or branch operator
  const [requestBranch, setRequestBranch] = useState<string>(() => {
    if (selectedBranch && selectedBranch !== 'all') return selectedBranch;
    return user?.branch && user.branch !== 'all' ? user.branch : 'kalyan';
  });

  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'all') {
      setRequestBranch(selectedBranch);
    }
  }, [selectedBranch]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [jewellerName, setJewellerName] = useState('');
  const [phone, setPhone] = useState('');
  const [item, setItem] = useState('');
  const [metalType, setMetalType] = useState<'GOLD' | 'SILVER'>('GOLD');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('g');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);

  // Customer Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<CustomerDTO[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Submission & Result Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<TestRequestDTO | null>(null);

  // Automatic Indian Business Date
  const todayIndianDate = formatIndianDateDisplay(getIndianBusinessDate());

  // Live Customer Autocomplete Search
  useEffect(() => {
    if (customerName.trim().length >= 2 && !selectedCustomerId) {
      const delay = setTimeout(async () => {
        setIsSearchingCustomer(true);
        try {
          const filterBranch = isAdmin ? branchFilterQuery : user?.branch;
          const results = await api.searchCustomers(customerName.trim(), filterBranch);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch {
          // Ignore
        } finally {
          setIsSearchingCustomer(false);
        }
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customerName, selectedCustomerId, isAdmin, user?.branch, branchFilterQuery]);

  const handleSelectCustomer = (c: CustomerDTO) => {
    setCustomerName(c.name);
    if (c.jewellerName) setJewellerName(c.jewellerName);
    setPhone(c.phone);
    setSelectedCustomerId(c.id);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMessage('Please enter a valid weight greater than 0');
      return;
    }

    const normPhone = normalizeIndianPhone(phone);
    if (!normPhone.isValid) {
      setErrorMessage(normPhone.error || 'Please enter a valid 10-digit Indian phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetBranch = isAdmin ? requestBranch : (user?.branch || 'kalyan');
      const result = await api.createTestRequest({
        customerId: selectedCustomerId,
        customerName: customerName.trim(),
        jewellerName: jewellerName.trim() || undefined,
        phone: normPhone.canonical,
        item: item.trim(),
        metalType,
        weight: parsedWeight,
        weightUnit,
        branch: targetBranch,
      });

      setCreatedRequest(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create test request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setCustomerName('');
    setJewellerName('');
    setPhone('');
    setItem('');
    setMetalType('GOLD');
    setWeight('');
    setSelectedCustomerId(undefined);
    setCreatedRequest(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-gold-400 text-xs uppercase tracking-widest font-mono font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Reception Desk</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          New Testing Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Generate an assay test order and atomic daily token for incoming precious metal sample.
        </p>
      </div>

      {/* Main Reception Form Card */}
      <div className="glass-panel-glow rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-gold-500/30 shadow-2xl relative">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Top Row: Business Date & Admin Branch Selection */}
          <div className={`grid gap-4 ${isAdmin ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>Business Date</span>
                </span>
                <span className="text-[10px] font-mono text-gold-400/90 uppercase bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">
                  AUTO (Asia/Kolkata)
                </span>
              </label>
              <input
                type="text"
                readOnly
                value={todayIndianDate}
                className="w-full bg-obsidian-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-gold-300 cursor-not-allowed select-none"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-gold-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gold-400" />
                    <span>Target Lab Branch</span>
                    <span className="text-red-400 font-bold">*</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Admin Controlled
                  </span>
                </label>
                <select
                  value={requestBranch}
                  onChange={(e) => setRequestBranch(e.target.value)}
                  className="w-full bg-obsidian-900/90 border border-gold-500/40 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
                >
                  {BRANCH_LIST.filter((b) => b.slug !== 'all').map((b) => (
                    <option key={b.slug} value={b.slug} className="bg-obsidian-900 text-slate-100">
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Customer & Jeweller Row (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gold-400" />
                  <span>Customer Name</span>
                  <span className="text-red-400 font-bold">*</span>
                </span>
                {selectedCustomerId && (
                  <span className="text-[10px] text-emerald-400 font-medium">✓ Selected</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setSelectedCustomerId(undefined);
                  }}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full bg-obsidian-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
                />
                {isSearchingCustomer && (
                  <div className="absolute right-3.5 top-3 text-slate-400">
                    <Search className="w-4 h-4 animate-spin text-gold-400" />
                  </div>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-obsidian-850 border border-gold-500/30 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  <div className="p-2 text-[10px] text-gold-400/80 font-mono uppercase tracking-wider border-b border-slate-800">
                    Matching Registered Customers:
                  </div>
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectCustomer(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gold-500/15 transition flex items-center justify-between text-xs text-slate-200 border-b border-slate-800/50 last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-slate-100">{s.name}</span>
                        {s.jewellerName && (
                          <span className="text-[10px] text-amber-400 block font-normal">M/s: {s.jewellerName}</span>
                        )}
                      </div>
                      <span className="font-mono text-slate-400">{s.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Jeweller / Shop Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jeweller / Shop Name</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400 uppercase bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                  Optional
                </span>
              </label>
              <input
                type="text"
                value={jewellerName}
                onChange={(e) => setJewellerName(e.target.value)}
                placeholder="e.g. ABC Jewellers, R.K. Bullion"
                className="w-full bg-obsidian-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-gold-400" />
              <span>Customer Contact Phone</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210 or +919876543210"
                className="w-full bg-obsidian-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Used for token verification and customer record keeping.
            </p>
          </div>

          {/* Item Description & Metal Type Checkboxes Beside It */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Item Description (7 cols) */}
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Gem className="w-3.5 h-3.5 text-gold-400" />
                <span>Item / Sample Description</span>
                <span className="text-red-400 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Chain, Ring, 22K Bangle, Cast Bar, Coin"
                className="w-full bg-obsidian-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
              />
            </div>

            {/* Metal Checkboxes: Gold or Silver (5 cols) */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Metal Type</span>
                <span className="text-[10px] font-mono text-gold-400/80 font-normal">Select One</span>
              </label>
              <div className="grid grid-cols-2 gap-2 min-h-[44px]">
                {/* Gold Checkbox */}
                <label
                  onClick={() => setMetalType('GOLD')}
                  className={`flex items-center justify-center space-x-2 px-2.5 py-2.5 rounded-xl border cursor-pointer select-none transition ${
                    metalType === 'GOLD'
                      ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/50'
                      : 'bg-obsidian-900/80 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={metalType === 'GOLD'}
                    onChange={() => setMetalType('GOLD')}
                    className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold tracking-wide uppercase">🟡 Gold</span>
                </label>

                {/* Silver Checkbox */}
                <label
                  onClick={() => setMetalType('SILVER')}
                  className={`flex items-center justify-center space-x-2 px-2.5 py-2.5 rounded-xl border cursor-pointer select-none transition ${
                    metalType === 'SILVER'
                      ? 'bg-slate-700/50 border-slate-200 text-slate-100 shadow-sm ring-1 ring-slate-300/50'
                      : 'bg-obsidian-900/80 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={metalType === 'SILVER'}
                    onChange={() => setMetalType('SILVER')}
                    className="w-4 h-4 rounded border-slate-600 text-slate-300 focus:ring-slate-300 accent-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold tracking-wide uppercase">⚪ Silver</span>
                </label>
              </div>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-gold-400" />
              <span>Sample Weight</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0.001"
                required
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="25.430"
                className="flex-1 bg-obsidian-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
              />
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                className="bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gold-300 font-mono focus:outline-none focus:border-gold-400"
              >
                <option value="g">grams (g)</option>
                <option value="kg">kg</option>
                <option value="tola">tola</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 gold-button rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 mt-4 active:scale-95 transition"
          >
            <span>{isSubmitting ? 'Generating Token...' : 'Create Testing Request'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Generated Token Success Modal */}
      {createdRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-glow rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full border-2 border-gold-400 shadow-2xl text-center space-y-5 sm:space-y-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 flex items-center justify-center mx-auto shadow-xl shadow-gold-500/30">
              <CheckCircle className="w-8 h-8 sm:w-9 sm:h-9 text-obsidian-900" />
            </div>

            <div>
              <p className="text-xs font-mono font-bold text-gold-400 uppercase tracking-widest">
                Testing Request Created
              </p>
              <h2 className="text-2xl sm:text-3xl font-black font-mono gold-gradient-text tracking-wider mt-1">
                {createdRequest.tokenNumber}
              </h2>
            </div>

            <div className="bg-obsidian-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-100">{createdRequest.customerNameSnapshot}</span>
              </div>
              {createdRequest.jewellerName && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Jeweller:</span>
                  <span className="font-semibold text-amber-300">M/s {createdRequest.jewellerName}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Phone:</span>
                <span className="font-mono text-slate-200">{createdRequest.phoneSnapshot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Item & Metal:</span>
                <div className="text-right">
                  <span className="font-semibold text-slate-100">{createdRequest.item}</span>
                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    createdRequest.metalType === 'SILVER'
                      ? 'text-slate-300 bg-slate-700/50 border-slate-600'
                      : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                  }`}>
                    {createdRequest.metalType || 'GOLD'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Weight:</span>
                <span className="font-mono text-gold-300 font-bold">{createdRequest.weight} {createdRequest.weightUnit}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">
                  WAITING IN QUEUE
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleResetForNext}
                className="py-3 px-4 gold-button rounded-xl text-xs font-semibold"
              >
                + New Request
              </button>
              <button
                onClick={() => router.push('/reception/dashboard')}
                className="py-3 px-4 bg-obsidian-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
