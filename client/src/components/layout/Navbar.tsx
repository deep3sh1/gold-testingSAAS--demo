'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { formatIndianDateDisplay, getIndianBusinessDate } from '@goldscope/shared';
import { useBranch, BRANCH_LIST } from '../../hooks/useBranch';
import {
  Sparkles,
  ClipboardList,
  PlusCircle,
  FlaskConical,
  Users,
  LogOut,
  Clock,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { selectedBranch, setSelectedBranch, isAdmin } = useBranch();
  const pathname = usePathname();
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);
      setIstTime(timeStr);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user || pathname?.startsWith('/login')) {
    return null;
  }

  const isReception = user.role === 'RECEPTIONIST' || user.role === 'ORGANIZATION_ADMIN' || user.role === 'SUPER_ADMIN';
  const isTester = user.role === 'TESTER' || user.role === 'ORGANIZATION_ADMIN' || user.role === 'SUPER_ADMIN';

  const todayIndianDate = formatIndianDateDisplay(getIndianBusinessDate());

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gold-500/20 px-3 sm:px-6 py-2.5 w-full">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Left Navigation */}
        <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
          <Link
            href={user.role === 'TESTER' ? '/tester/queue' : '/reception/dashboard'}
            className="flex items-center space-x-2.5 group shrink-0 select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-gold-500/20 ring-1 ring-gold-400/50 group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
              <img
                src="/images/client-logo.jpeg"
                alt="Aurum Touch Lab Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="shrink-0 flex flex-col justify-center">
              <span className="text-sm sm:text-base font-extrabold tracking-wide gold-gradient-text font-mono whitespace-nowrap leading-tight">
                AURUM TOUCH LAB
              </span>
              <span className="text-[9px] tracking-widest text-gold-400/80 font-bold uppercase whitespace-nowrap leading-none mt-0.5">
                ASSAY &amp; HALLMARK
              </span>
            </div>
          </Link>

          {/* Navigation Links - One clean line with whitespace-nowrap */}
          <nav className="hidden md:flex items-center space-x-1 pl-3 sm:pl-4 border-l border-slate-800 shrink-0">
            {isReception && (
              <>
                <Link
                  href="/reception/dashboard"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    pathname === '/reception/dashboard'
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                  <span>Today's Requests</span>
                </Link>

                <Link
                  href="/reception/requests/new"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    pathname === '/reception/requests/new'
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>New Request</span>
                </Link>

                <Link
                  href="/reception/customers"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    pathname === '/reception/customers'
                      ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Customers</span>
                </Link>
              </>
            )}

            {isTester && (
              <Link
                href="/tester/queue"
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  pathname === '/tester/queue'
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                <span>Tester Queue</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right Info: Branch Selector, Live IST Clock & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Admin Branch Selector */}
          {isAdmin && (
            <div className="flex items-center space-x-1.5 bg-obsidian-850 border border-gold-500/35 rounded-xl px-2.5 py-1.5 shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400/80 whitespace-nowrap hidden xl:inline">
                Branch:
              </span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none cursor-pointer pr-1"
              >
                {BRANCH_LIST.map((b) => (
                  <option key={b.slug} value={b.slug} className="bg-[#0f172a] text-slate-100">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live IST Clock */}
          <div className="hidden lg:flex items-center space-x-2 bg-obsidian-850 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span className="text-slate-300 font-mono text-[11px] font-medium">{todayIndianDate}</span>
            <span className="text-slate-600">|</span>
            <span className="text-gold-400 font-mono text-[11px] font-semibold">{istTime || 'IST'}</span>
          </div>

          {/* User Badge: Admin / User Name */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 bg-obsidian-850 border border-slate-800 px-2.5 py-1.5 rounded-xl shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
            </div>
            <div className="text-left whitespace-nowrap">
              <p className="text-xs font-bold text-slate-100 leading-tight">
                {isAdmin ? (user.name || 'Admin') : user.name.replace(/\s*\(Admin\)/i, '')}
              </p>
              <p className="text-[10px] text-gold-400/90 font-mono tracking-wider uppercase leading-tight mt-0.5">
                {isAdmin
                  ? (selectedBranch === 'all' ? 'ALL BRANCHES' : selectedBranch.toUpperCase().replace('_', ' '))
                  : (user.branch ? user.branch.toUpperCase().replace('_', ' ') : 'KALYAN')
                }
              </p>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
