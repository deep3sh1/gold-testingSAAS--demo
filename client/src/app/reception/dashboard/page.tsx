'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, API_BASE_URL } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { useAuth } from '../../../hooks/useAuth';
import { useBranch } from '../../../hooks/useBranch';
import { TestRequestDTO } from '@goldscope/types';
import { formatIndianDateDisplay, formatIndianTimeDisplay, getIndianBusinessDate } from '@goldscope/shared';
import {
  PlusCircle,
  Inbox,
  FlaskConical,
  CheckCircle2,
  Clock,
  Search,
  Scale,
  RefreshCw,
} from 'lucide-react';

export default function ReceptionDashboardPage() {
  const { user } = useAuth();
  const { branchFilterQuery, currentBranchLabel, isAdmin } = useBranch();
  const [requests, setRequests] = useState<TestRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const todayDateStr = getIndianBusinessDate();
  const todayDisplayDate = formatIndianDateDisplay(todayDateStr);

  const fetchTodayRequests = useCallback(async () => {
    try {
      const data = await api.listTestRequests({
        date: todayDateStr,
        limit: 100,
        branch: branchFilterQuery,
      });
      setRequests(data.items);
    } catch (err) {
      console.error('Failed to load today requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [todayDateStr, branchFilterQuery]);

  useEffect(() => {
    fetchTodayRequests();

    // Socket.IO Realtime Listener
    const socket = getSocket();
    if (socket) {
      const handleCreated = (newReq: TestRequestDTO) => {
        const activeBranch = branchFilterQuery || user?.branch;
        if (activeBranch && newReq.branch && activeBranch !== newReq.branch) {
          return;
        }
        setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      };

      const handleClaimed = (data: { requestId: string; testerName: string }) => {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === data.requestId
              ? { ...r, status: 'TESTING', assignedTesterName: data.testerName }
              : r
          )
        );
      };

      const handleCompleted = (data: { requestId: string; testerValue: number }) => {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === data.requestId
              ? { ...r, status: 'SENT', testerValue: data.testerValue }
              : r
          )
        );
      };

      socket.on('test-request:created', handleCreated);
      socket.on('test-request:claimed', handleClaimed);
      socket.on('test-request:completed', handleCompleted);

      return () => {
        socket.off('test-request:created', handleCreated);
        socket.off('test-request:claimed', handleClaimed);
        socket.off('test-request:completed', handleCompleted);
      };
    }
  }, [fetchTodayRequests]);

  // Compute live metrics
  const totalCount = requests.length;
  const waitingCount = requests.filter((r) => r.status === 'WAITING').length;
  const testingCount = requests.filter((r) => r.status === 'TESTING').length;
  const sentCount = requests.filter((r) => r.status === 'SENT').length;
  const totalWeightGrams = requests.reduce((acc, curr) => acc + (curr.weight || 0), 0);

  // Filter requests by search query
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.tokenNumber.toLowerCase().includes(q) ||
      r.customerNameSnapshot.toLowerCase().includes(q) ||
      r.phoneSnapshot.includes(q) ||
      r.item.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold-400 text-xs uppercase tracking-widest font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Reception Operations</span>
            {isAdmin && (
              <span className="bg-gold-500/15 border border-gold-500/30 text-gold-300 text-[10px] px-2 py-0.5 rounded-md font-sans font-bold normal-case">
                Branch: {currentBranchLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Today's Requests
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Indian Business Date: <span className="text-gold-300 font-mono font-semibold">{todayDisplayDate}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
          <button
            onClick={fetchTodayRequests}
            title="Refresh Table"
            className="p-2.5 rounded-xl bg-obsidian-850 hover:bg-slate-800 text-slate-300 border border-slate-700 transition shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/reception/requests/new"
            className="flex-1 sm:flex-initial py-2.5 px-4 gold-button rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Request</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Today</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gold-500/10 text-gold-400">
              <Inbox className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-slate-100 mt-1 sm:mt-2">{totalCount}</p>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Waiting</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1 sm:mt-2">{waitingCount}</p>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Testing</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-sky-500/10 text-sky-400">
              <FlaskConical className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-sky-400 mt-1 sm:mt-2">{testingCount}</p>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1 sm:mt-2">{sentCount}</p>
        </div>
      </div>

      {/* Requests Section */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Token, Customer, Phone..."
              className="w-full bg-obsidian-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
            />
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-1.5 self-end sm:self-center">
            <Scale className="w-3.5 h-3.5 text-gold-400" />
            <span>Total Weight:</span>
            <span className="font-mono font-bold text-slate-200">{totalWeightGrams.toFixed(3)} g</span>
          </div>
        </div>

        {/* Loading / Empty States */}
        {isLoading ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gold-400 mb-2" />
            <p className="text-xs sm:text-sm">Loading today's requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <p className="text-sm font-medium text-slate-400">No requests found for today</p>
            <p className="text-xs text-slate-600 mt-1">Click "+ New Request" to create the first token.</p>
          </div>
        ) : (
          <>
            {/* Mobile Touch Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {filteredRequests.map((req) => (
                <div key={req.id} className="p-4 space-y-3 hover:bg-slate-800/30 transition">
                  {/* Top Bar: Token & Status & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-gold-400">
                        {req.tokenNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatIndianTimeDisplay(req.createdAt)}
                      </span>
                    </div>

                    <div>
                      {req.status === 'WAITING' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          WAITING
                        </span>
                      )}
                      {req.status === 'TESTING' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          TESTING
                        </span>
                      )}
                      {req.status === 'SENT' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ✓ SENT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer & Jeweller */}
                  <div className="bg-obsidian-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-xs">{req.customerNameSnapshot}</span>
                      <span className="text-[11px] font-mono text-slate-400">{req.phoneSnapshot}</span>
                    </div>
                    {req.jewellerName && (
                      <div className="text-[11px] text-amber-400 font-medium">
                        M/s: {req.jewellerName}
                      </div>
                    )}
                  </div>

                  {/* Sample & Test Results Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-obsidian-900/40 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Item & Weight</span>
                      <div className="font-medium text-slate-200 mt-0.5 flex items-center space-x-1.5 flex-wrap">
                        <span>{req.item}</span>
                        <span className={`text-[9px] font-bold px-1 rounded border ${
                          req.metalType === 'SILVER'
                            ? 'text-slate-300 bg-slate-700/50 border-slate-600'
                            : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        }`}>
                          {req.metalType || 'GOLD'}
                        </span>
                      </div>
                      <span className="font-mono text-gold-300 font-semibold block text-[11px] mt-0.5">
                        {req.weight} {req.weightUnit}
                      </span>
                    </div>

                    <div className="bg-obsidian-900/40 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Assay Value</span>
                      {req.testerValue !== undefined && req.testerValue !== null ? (
                        <div className="mt-0.5">
                          <span className="font-mono font-bold text-gold-300 text-sm">
                            {req.testerValue} {req.testerValueUnit || '%'}
                          </span>
                          {req.karat && (
                            <span className="text-[10px] text-amber-400 block font-mono font-semibold">
                              {req.karat} K
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-xs mt-1 block">In Progress...</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <a
                      href={`${API_BASE_URL}/public/certificates/${req.id}?mode=preprinted`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-1 text-center bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 active:scale-95 transition"
                    >
                      <span>🖨️ Slip</span>
                    </a>
                    <a
                      href={`${API_BASE_URL}/public/certificates/${req.id}.pdf`}
                      download={`AurumTouchLab_Assay_${req.tokenNumber}.pdf`}
                      className="py-2 px-1 text-center bg-obsidian-850 hover:bg-gold-500/15 text-gold-300 border border-gold-500/30 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 active:scale-95 transition"
                    >
                      <span>📄 PDF</span>
                    </a>
                    <a
                      href={`https://wa.me/${req.phoneSnapshot.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `*AURUM TOUCH LAB ASSAY CERTIFICATE*\n\nCustomer: ${req.customerNameSnapshot}\nToken: ${req.tokenNumber}\nItem: ${req.item} (${req.weight} ${req.weightUnit})\nValue: ${req.testerValue ?? 'In Progress'}\n\nDownload Certificate: ${API_BASE_URL}/public/certificates/${req.id}.pdf`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-1 text-center bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 active:scale-95 transition"
                    >
                      <span>💬 WhatsApp</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-obsidian-850/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="px-4 py-3.5">Token</th>
                    <th className="px-4 py-3.5">Customer / M/s</th>
                    <th className="px-4 py-3.5">Item</th>
                    <th className="px-4 py-3.5">Weight</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Tester Value</th>
                    <th className="px-4 py-3.5">Time</th>
                    <th className="px-4 py-3.5 text-right">Certificate & WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-gold-400">
                        {req.tokenNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-200">{req.customerNameSnapshot}</div>
                        {req.jewellerName && (
                          <div className="text-[11px] text-amber-400 font-medium">M/s: {req.jewellerName}</div>
                        )}
                        <div className="text-[11px] text-slate-500 font-mono">{req.phoneSnapshot}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-medium">
                        <div>{req.item}</div>
                        <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          req.metalType === 'SILVER'
                            ? 'text-slate-300 bg-slate-700/50 border-slate-600'
                            : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        }`}>
                          {req.metalType || 'GOLD'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-200">
                        {req.weight} {req.weightUnit}
                      </td>
                      <td className="px-4 py-3.5">
                        {req.status === 'WAITING' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            WAITING
                          </span>
                        )}
                        {req.status === 'TESTING' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            TESTING ({req.assignedTesterName || 'Tester'})
                          </span>
                        )}
                        {req.status === 'SENT' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ✓ SENT
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
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <a
                          href={`${API_BASE_URL}/public/certificates/${req.id}?mode=preprinted`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-semibold transition"
                          title="Print on Pre-printed Letterhead Paper"
                        >
                          <span>🖨️ Print Slip</span>
                        </a>
                        <a
                          href={`${API_BASE_URL}/public/certificates/${req.id}.pdf`}
                          download={`AurumTouchLab_Assay_${req.tokenNumber}.pdf`}
                          className="inline-flex items-center px-2.5 py-1 bg-obsidian-850 hover:bg-gold-500/15 text-gold-300 border border-gold-500/30 rounded-lg text-[10px] font-semibold transition"
                          title="Download Digital PDF (with header)"
                        >
                          <span>📄 PDF</span>
                        </a>
                        <a
                          href={`https://wa.me/${req.phoneSnapshot.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `*AURUM TOUCH LAB ASSAY CERTIFICATE*\n\nCustomer: ${req.customerNameSnapshot}\nToken: ${req.tokenNumber}\nItem: ${req.item} (${req.weight} ${req.weightUnit})\nValue: ${req.testerValue ?? 'In Progress'}\n\nDownload Certificate: ${API_BASE_URL}/public/certificates/${req.id}.pdf`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-semibold transition"
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
