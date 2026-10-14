'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { useAuth } from '../../../hooks/useAuth';
import { useBranch } from '../../../hooks/useBranch';
import { TestRequestDTO, TestRequestStatus } from '@goldscope/types';
import { formatIndianDateDisplay, formatIndianTimeDisplay, getIndianBusinessDate } from '@goldscope/shared';
import {
  FlaskConical,
  Search,
  Calendar,
  Send,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Phone,
  Scale,
  Printer,
  ExternalLink,
  X,
} from 'lucide-react';

export default function TesterQueuePage() {
  const { user } = useAuth();
  const { branchFilterQuery, currentBranchLabel, isAdmin } = useBranch();
  const [requests, setRequests] = useState<TestRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(getIndianBusinessDate());
  const [statusFilter, setStatusFilter] = useState<'WAITING' | 'TESTING' | 'SENT' | 'ALL'>('ALL');

  // Tester Value Input map: { [requestId]: valueString }
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);
  const [isSendingId, setIsSendingId] = useState<string | null>(null);
  const [notificationAlert, setNotificationAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activePrintModalId, setActivePrintModalId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getTesterQueue({
        search: searchQuery.trim() || undefined,
        date: dateFilter || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        branch: branchFilterQuery,
      });
      setRequests(res.items);
    } catch (err) {
      console.error('Error fetching tester queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, dateFilter, statusFilter, branchFilterQuery]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Realtime Socket.IO synchronization
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleCreated = (newReq: TestRequestDTO) => {
        if (user?.branch && newReq.branch && user.branch !== newReq.branch) {
          return;
        }
        setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      };

      const handleClaimed = (data: { requestId: string; testerId: string; testerName: string; claimedAt: string }) => {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === data.requestId
              ? {
                  ...r,
                  status: 'TESTING',
                  assignedTesterId: data.testerId,
                  assignedTesterName: data.testerName,
                  claimedAt: data.claimedAt,
                }
              : r
          )
        );
      };

      const handleCompleted = (data: { requestId: string; testerValue: number; completedAt: string }) => {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === data.requestId
              ? {
                  ...r,
                  status: 'SENT',
                  testerValue: data.testerValue,
                  completedAt: data.completedAt,
                }
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
  }, []);

  const handleClaim = async (requestId: string) => {
    setIsClaimingId(requestId);
    setNotificationAlert(null);
    try {
      const updated = await api.claimRequest(requestId);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      setNotificationAlert({
        msg: `Request ${updated.tokenNumber} claimed successfully. Enter testing value below.`,
        type: 'success',
      });
    } catch (err) {
      setNotificationAlert({
        msg: err instanceof Error ? err.message : 'Claim conflict: request taken by another tester.',
        type: 'error',
      });
      fetchQueue();
    } finally {
      setIsClaimingId(null);
    }
  };

  const handleSubmitValue = async (requestId: string) => {
    const targetReq = requests.find((r) => r.id === requestId);
    if (targetReq && targetReq.status === 'SENT') {
      // Already completed & sent! Do not re-send to avoid duplicates.
      setNotificationAlert({
        msg: `Notice: Token ${targetReq.tokenNumber} is already completed & sent. Opening print report directly.`,
        type: 'success',
      });
      triggerPrintSlip(targetReq.id);
      return;
    }

    const rawVal = valueInputs[requestId];
    const num = parseFloat(rawVal);

    if (isNaN(num) || num < 0) {
      setNotificationAlert({ msg: 'Please enter a valid numeric value (e.g. 2.5 or 8.2)', type: 'error' });
      return;
    }

    // Pre-open print window synchronously during the user click gesture so popup blocker never blocks it!
    const printWin = window.open(
      'about:blank',
      'AurumTouchLabPrintSlip',
      'width=920,height=750,left=120,top=80,menubar=no,toolbar=no,location=no'
    );
    if (printWin) {
      try {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>Opening Aurum Touch Lab Print Slip...</title></head>
            <body style="background:#0f172a;color:#f8fafc;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;">
                <div style="width:36px;height:36px;border:3px solid #d4af37;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>
                <p style="font-size:14px;font-weight:bold;color:#d4af37;">Saving test result &amp; loading print slip...</p>
              </div>
              <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </body>
          </html>
        `);
      } catch {
        // Safe ignore
      }
    }

    setIsSendingId(requestId);
    setNotificationAlert(null);
    try {
      const updated = await api.submitTesterValue({
        requestId,
        testerValue: num,
      });

      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      setNotificationAlert({
        msg: `✓ Result ${num}% saved and print slip ready!`,
        type: 'success',
      });

      const printUrl = `${API_BASE_URL}/public/certificates/${updated.id}?mode=preprinted&_t=${Date.now()}`;
      if (printWin && !printWin.closed) {
        printWin.location.href = printUrl;
        printWin.focus();
      } else {
        // If window was blocked or closed, open the in-page modal dialog directly!
        setActivePrintModalId(updated.id);
      }
    } catch (err) {
      if (printWin && !printWin.closed) {
        printWin.close();
      }
      setNotificationAlert({
        msg: err instanceof Error ? err.message : 'Failed to submit tester value',
        type: 'error',
      });
    } finally {
      setIsSendingId(null);
    }
  };

  const triggerPrintSlip = (requestId: string) => {
    const printUrl = `${API_BASE_URL}/public/certificates/${requestId}?mode=preprinted&_t=${Date.now()}`;
    const printWin = window.open(
      printUrl,
      'AurumTouchLabPrintSlip',
      'width=920,height=750,left=120,top=80,menubar=no,toolbar=no,location=no'
    );
    if (printWin) {
      printWin.focus();
    } else {
      setActivePrintModalId(requestId);
    }
  };

  const handleValueChange = (requestId: string, val: string) => {
    setValueInputs((prev) => ({ ...prev, [requestId]: val }));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-gold-400 text-xs uppercase tracking-widest font-mono font-semibold">
            <FlaskConical className="w-4 h-4" />
            <span>Assay Workbench</span>
            {isAdmin && (
              <span className="bg-gold-500/15 border border-gold-500/30 text-gold-300 text-[10px] px-2 py-0.5 rounded-md font-sans font-bold normal-case">
                Branch: {currentBranchLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mt-1">
            Testing Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Claim samples, enter measured assay values, and trigger instant customer WhatsApp updates.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="self-start sm:self-auto py-2.5 px-4 bg-obsidian-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-gold-400' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Alert Banner */}
      {notificationAlert && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-center justify-between border ${
            notificationAlert.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          <span>{notificationAlert.msg}</span>
          <button onClick={() => setNotificationAlert(null)} className="ml-3 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Token, Customer, Phone, Item..."
            className="w-full bg-obsidian-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
          />
        </div>

        {/* Date Filter & Status Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Date Filter with Today / All Dates shortcuts */}
          <div className="flex items-center justify-between sm:justify-start space-x-2">
            <div className="flex items-center bg-obsidian-900 border border-slate-700 rounded-xl px-2.5 py-1.5 space-x-2 flex-1 sm:flex-initial">
              <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none w-full sm:w-auto"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-[10px] text-slate-400 hover:text-red-400 px-1 font-semibold"
                  title="Clear date filter"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={() => setDateFilter(getIndianBusinessDate())}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                  dateFilter === getIndianBusinessDate()
                    ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                    : 'bg-obsidian-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                  dateFilter === ''
                    ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                    : 'bg-obsidian-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                All Dates
              </button>
            </div>
          </div>

          {/* Status Chips with Horizontal Touch Scrolling */}
          <div className="flex items-center space-x-1.5 bg-obsidian-900 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar shrink-0">
            {(['ALL', 'WAITING', 'TESTING', 'SENT'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === st
                    ? 'bg-gold-500 text-obsidian-900 shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Queue Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gold-400 mb-3" />
          <p className="text-sm">Loading testing queue...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-panel py-16 px-4 text-center rounded-2xl border border-slate-800 space-y-4">
          <FlaskConical className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <div>
            <p className="text-base font-semibold text-slate-200">No requests match current filters</p>
            <p className="text-xs text-slate-400 mt-1">
              {dateFilter
                ? `Filtered for ${formatIndianDateDisplay(dateFilter)} with status "${statusFilter}".`
                : `Filtered with status "${statusFilter}".`}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {dateFilter !== '' && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="py-1.5 px-3 bg-obsidian-850 hover:bg-slate-800 text-gold-400 border border-gold-500/30 rounded-lg text-xs font-semibold"
              >
                View All Dates
              </button>
            )}
            {statusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="py-1.5 px-3 bg-obsidian-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold"
              >
                Set Status to ALL
              </button>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="py-1.5 px-3 bg-obsidian-850 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests.map((req) => {
            const isAssignedToMe = user && req.assignedTesterId === user.id;
            const isWaiting = req.status === 'WAITING';
            const isTesting = req.status === 'TESTING';
            const isSent = req.status === 'SENT';

            return (
              <div
                key={req.id}
                className={`glass-panel rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  isWaiting
                    ? 'border-amber-500/30 hover:border-amber-500/60'
                    : isTesting
                    ? 'border-sky-500/40 bg-obsidian-850 shadow-lg shadow-sky-500/5'
                    : 'border-emerald-500/30 bg-obsidian-900/60'
                }`}
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-black text-lg text-gold-400 tracking-wide">
                      {req.tokenNumber}
                    </span>

                    {/* Status Badge */}
                    {isWaiting && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>WAITING</span>
                      </span>
                    )}
                    {isTesting && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center space-x-1 animate-pulse">
                        <FlaskConical className="w-3 h-3" />
                        <span>IN TESTING</span>
                      </span>
                    )}
                    {isSent && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>COMPLETED</span>
                      </span>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 mb-4">
                    <h3 className="text-base font-bold text-slate-100">{req.customerNameSnapshot}</h3>
                    {req.jewellerName && (
                      <p className="text-xs text-amber-400 font-medium">M/s: {req.jewellerName}</p>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-gold-400" />
                      <span className="font-mono">{req.phoneSnapshot}</span>
                    </div>
                  </div>

                  {/* Item & Weight Pills */}
                  <div className="bg-obsidian-900/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Item:</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-200">{req.item}</span>
                        <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          req.metalType === 'SILVER'
                            ? 'text-slate-300 bg-slate-700/50 border-slate-600'
                            : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        }`}>
                          {req.metalType || 'GOLD'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Scale className="w-3 h-3 text-gold-400" />
                        <span>Weight:</span>
                      </span>
                      <span className="font-mono font-bold text-gold-300">
                        {req.weight} {req.weightUnit}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Date: {formatIndianDateDisplay(req.businessDate)}</span>
                      <span>Time: {formatIndianTimeDisplay(req.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Area */}
                <div className="pt-2">
                  {/* Case 1: Waiting -> Take Request Button */}
                  {isWaiting && (
                    <button
                      onClick={() => handleClaim(req.id)}
                      disabled={isClaimingId === req.id}
                      className="w-full py-2.5 px-4 gold-button rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow"
                    >
                      <FlaskConical className="w-4 h-4" />
                      <span>{isClaimingId === req.id ? 'Claiming...' : 'TAKE REQUEST'}</span>
                    </button>
                  )}

                  {/* Case 2: Testing -> Enter Value & Send */}
                  {isTesting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Assigned: <strong className="text-slate-200">{req.assignedTesterName || 'You'}</strong></span>
                        <span className="font-mono text-sky-400 font-medium">Claimed</span>
                      </div>

                      <div className="space-y-2 bg-sky-950/20 p-3 rounded-xl border border-sky-500/30">
                        <label className="block text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
                          Tester Value (e.g. 2.5, 8.2)
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            placeholder="Enter value..."
                            value={valueInputs[req.id] !== undefined ? valueInputs[req.id] : req.testerValue || ''}
                            onChange={(e) => handleValueChange(req.id, e.target.value)}
                            className="flex-1 bg-obsidian-900 border border-slate-700 rounded-lg px-3 py-2.5 text-base sm:text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-gold-400"
                          />
                          <button
                            onClick={() => handleSubmitValue(req.id)}
                            disabled={isSendingId === req.id}
                            className="py-2.5 px-4 gold-button rounded-lg text-xs font-bold flex items-center space-x-1.5 shrink-0 active:scale-95 transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{isSendingId === req.id ? 'Saving...' : 'SUBMIT & PRINT'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Case 3: Completed -> Show clean Measured Value & Karat without bulky buttons */}
                  {isSent && (
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <div className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sent to Customer &amp; Printed</span>
                        </div>
                        <p className="text-2xl font-black font-mono text-slate-100">
                          {req.testerValue} {req.testerValueUnit || '%'}
                        </p>
                        {req.karat && (
                          <p className="text-xs font-mono text-amber-300 font-bold mt-0.5">
                            Karat: {req.karat} K
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                        <span className="text-emerald-400/80 font-mono text-[10px]">Auto-dispatched</span>
                        <button
                          type="button"
                          onClick={() => triggerPrintSlip(req.id)}
                          className="hover:text-amber-300 text-slate-400 underline font-medium transition text-[11px] bg-transparent border-none p-0 cursor-pointer"
                          title="Reprint slip on pre-printed paper"
                        >
                          🖨️ Reprint slip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct In-Page Print Report & Slip Modal UI */}
      {activePrintModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-obsidian-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-obsidian-900 border-0 sm:border border-gold-500/40 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl h-full sm:h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 bg-obsidian-850">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center shrink-0">
                  <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center space-x-1.5 sm:space-x-2">
                    <span>Print Report &amp; Slip</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                      Pre-printed Slip
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block">
                    Preview and print the test certificate directly.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const printUrl = `${API_BASE_URL}/public/certificates/${activePrintModalId}?mode=preprinted&_t=${Date.now()}`;
                    window.open(printUrl, 'AurumTouchLabPrintSlip', 'width=920,height=750,left=120,top=80');
                  }}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Detach</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePrintModalId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Iframe Content */}
            <div className="flex-1 bg-slate-950 relative">
              <iframe
                src={`${API_BASE_URL}/public/certificates/${activePrintModalId}?mode=preprinted&_t=${Date.now()}`}
                className="w-full h-full border-0"
                title="Assay Slip Print Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
