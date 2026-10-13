'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { TestRequestDTO } from '@goldscope/types';
import { formatIndianDateDisplay, formatIndianTimeDisplay } from '@goldscope/shared';
import { useBranch } from '../../../hooks/useBranch';
import { PlusCircle, Search, Calendar, RefreshCw } from 'lucide-react';

export default function AllRequestsPage() {
  const { branchFilterQuery, currentBranchLabel } = useBranch();
  const [requests, setRequests] = useState<TestRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.listTestRequests({
        search: searchQuery.trim() || undefined,
        date: dateFilter || undefined,
        status: statusFilter || undefined,
        branch: branchFilterQuery,
        limit: 100,
      });
      setRequests(data.items);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateFilter, statusFilter, branchFilterQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            All Testing Requests & Archive
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Historical test logs with immutable customer snapshots and token sequences.
          </p>
        </div>

        <Link
          href="/reception/requests/new"
          className="py-2.5 px-4 gold-button rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Request</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Token, Customer Name, Phone, Item..."
            className="w-full bg-obsidian-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gold-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-gold-400"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs text-slate-400 hover:text-slate-200">
              Clear
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-obsidian-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-gold-300 font-semibold focus:outline-none focus:border-gold-400"
        >
          <option value="">All Statuses</option>
          <option value="WAITING">WAITING</option>
          <option value="TESTING">TESTING</option>
          <option value="SENT">SENT</option>
        </select>

        <button
          onClick={fetchRequests}
          className="p-2 rounded-xl bg-obsidian-850 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-obsidian-850/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-4 py-3.5">Token</th>
                <th className="px-4 py-3.5">Business Date</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Item</th>
                <th className="px-4 py-3.5">Weight</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Tester Value</th>
                <th className="px-4 py-3.5">Created Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gold-400 mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-gold-400">{req.tokenNumber}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">{formatIndianDateDisplay(req.businessDate)}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-200">{req.customerNameSnapshot}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{req.phoneSnapshot}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{req.item}</td>
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-200">
                      {req.weight} {req.weightUnit}
                    </td>
                    <td className="px-4 py-3.5">
                      {req.status === 'WAITING' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          WAITING
                        </span>
                      )}
                      {req.status === 'TESTING' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          TESTING
                        </span>
                      )}
                      {req.status === 'SENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          SENT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold">
                      {req.testerValue !== undefined && req.testerValue !== null ? (
                        <span className="text-gold-300 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">
                          {req.testerValue} {req.testerValueUnit || ''}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {formatIndianTimeDisplay(req.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
