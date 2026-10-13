'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Sparkles,
  ClipboardList,
  FlaskConical,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type TerminalRole = 'reception' | 'tester' | 'admin';

interface TerminalConfig {
  id: TerminalRole;
  label: string;
  placeholder: string;
  roleBadge: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const TERMINALS: Record<TerminalRole, TerminalConfig> = {
  reception: {
    id: 'reception',
    label: 'Reception Desk',
    placeholder: 'Enter username (e.g. reception.kalyan)',
    roleBadge: 'Receptionist',
    subtitle: 'Customer intake, token generation & registration',
    icon: ClipboardList,
    accentColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  tester: {
    id: 'tester',
    label: 'Assay Tester',
    placeholder: 'Enter username (e.g. tester.kalyan)',
    roleBadge: 'Assay Tester',
    subtitle: 'Testing queue, purity values, WhatsApp & print slip',
    icon: FlaskConical,
    accentColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  admin: {
    id: 'admin',
    label: 'Lab Admin',
    placeholder: 'Enter admin username or email',
    roleBadge: 'Administrator',
    subtitle: 'Full lab operations, all desks & audit oversight',
    icon: ShieldCheck,
    accentColor: 'text-gold-400 border-gold-500/30 bg-gold-500/10',
  },
};

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalRole>('reception');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rememberStation, setRememberStation] = useState(true);
  const [isStationRemembered, setIsStationRemembered] = useState(false);

  const BRANCH_PRESETS = [
    { name: 'Kalyan (West)', slug: 'kalyan' },
    { name: 'Kalyan (East)', slug: 'kalyaneast' },
    { name: 'Ulhasnagar', slug: 'ulhasnagar' },
    { name: 'Dombivli', slug: 'dombivali' },
  ];

  const checkRememberedPassword = (userStr: string) => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`goldscope_station_pwd_${userStr}`);
      if (saved) {
        setPassword(saved);
        setIsStationRemembered(true);
      } else {
        setPassword('');
        setIsStationRemembered(false);
      }
    } catch {
      setPassword('');
      setIsStationRemembered(false);
    }
  };

  const forgetRememberedStation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`goldscope_station_pwd_${username.trim()}`);
    } catch {
      // Ignore
    }
    setPassword('');
    setIsStationRemembered(false);
  };

  const handleSelectTerminal = (role: TerminalRole) => {
    setSelectedTerminal(role);
    setError(null);
    if (role === 'admin') {
      setUsername('admin');
      checkRememberedPassword('admin');
      return;
    }
    if (username.trim()) {
      let targetUser = username.trim();
      if (role === 'tester' && targetUser.startsWith('reception.')) {
        targetUser = targetUser.replace(/^reception\./, 'tester.');
      } else if (role === 'reception' && targetUser.startsWith('tester.')) {
        targetUser = targetUser.replace(/^tester\./, 'reception.');
      } else if (targetUser === 'admin' || targetUser.includes('admin')) {
        targetUser = role === 'tester' ? 'tester.kalyan' : 'reception.kalyan';
      }
      setUsername(targetUser);
      checkRememberedPassword(targetUser);
    }
  };

  const handleQuickFill = (slug: string) => {
    setError(null);
    let targetUser = '';
    if (selectedTerminal === 'admin') {
      targetUser = 'admin';
    } else if (selectedTerminal === 'tester') {
      targetUser = `tester.${slug}`;
    } else {
      targetUser = `reception.${slug}`;
    }
    setUsername(targetUser);
    // Only autofill password if this device has previously authenticated this station
    checkRememberedPassword(targetUser);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();

    if (!trimmedUser) {
      setError(`Please enter the username or email for ${TERMINALS[selectedTerminal].label}.`);
      return;
    }

    if (!password) {
      setError(`Please enter the password to access ${TERMINALS[selectedTerminal].label}.`);
      return;
    }

    // Role vs Terminal validation safeguards
    if (selectedTerminal === 'tester' && (trimmedUser.startsWith('reception.') || trimmedUser.includes('reception'))) {
      setError(
        `You selected the Assay Tester terminal, but entered a Reception Desk username ("${trimmedUser}"). Please use "tester.${trimmedUser.replace('reception.', '') || 'kalyan'}" or select a branch button below.`
      );
      return;
    }

    if (selectedTerminal === 'reception' && (trimmedUser.startsWith('tester.') || trimmedUser.includes('tester'))) {
      setError(
        `You selected the Reception Desk terminal, but entered an Assay Tester username ("${trimmedUser}"). Please use "reception.${trimmedUser.replace('tester.', '') || 'kalyan'}" or select a branch button below.`
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(trimmedUser, password);
      // Remember password on this device for subsequent visits if enabled
      if (typeof window !== 'undefined' && rememberStation) {
        try {
          localStorage.setItem(`goldscope_station_pwd_${trimmedUser}`, password);
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify username and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTerminal = TERMINALS[selectedTerminal];

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-white p-2.5 items-center justify-center shadow-2xl shadow-gold-500/20 mb-4 ring-2 ring-gold-400/50 hover:scale-105 transition-transform">
            <img
              src="/images/client-logo.jpeg"
              alt="Aurum Touch Lab Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gold-gradient-text font-mono">
            AURUM TOUCH LAB
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Precious Metals Testing &amp; Hallmark SaaS Platform
          </p>
        </div>

        {/* Main Terminal Card */}
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-gold-500/30 shadow-2xl relative overflow-hidden">
          {/* Terminal Selection Header */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Select Terminal to Access
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TERMINALS) as TerminalRole[]).map((role) => {
                const term = TERMINALS[role];
                const Icon = term.icon;
                const isSelected = selectedTerminal === role;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSelectTerminal(role)}
                    className={`py-3 px-2 rounded-xl border text-center transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-gold-400/80 shadow-lg shadow-gold-500/10 ring-1 ring-gold-400/40'
                        : 'bg-obsidian-850/80 hover:bg-slate-800/50 border-slate-700/80 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? term.accentColor : 'text-slate-400 bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? 'text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {term.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Station Branch Selector Chips (Only for Reception Desk & Assay Tester, NOT for Admin) */}
          {selectedTerminal === 'admin' ? (
            <div className="mb-5 p-3.5 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gold-500/20 border border-gold-500/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Master Lab Admin Access</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  Admin oversees all 4 branches. Switch between branches anytime inside the dashboard navbar.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Station Branch:
                </span>
                <span className="text-[10px] text-gold-400/80 font-mono">
                  {selectedTerminal === 'tester' ? 'Assay Tester Mode' : 'Reception Mode'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {BRANCH_PRESETS.map((bp) => (
                  <button
                    key={bp.slug}
                    type="button"
                    onClick={() => handleQuickFill(bp.slug)}
                    className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-gold-500/20 hover:border-gold-500/40 border border-slate-700/60 text-[11px] font-medium text-slate-300 hover:text-gold-300 transition text-center cursor-pointer"
                  >
                    {bp.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-tight">
                * Select a branch to set station. First-time access requires entering your authorized password.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Decoy hidden fields to prevent Chrome aggressive autofill */}
            <input type="text" name="fakeusernameremembered" tabIndex={-1} aria-hidden="true" className="sr-only fixed -top-96" />
            <input type="password" name="fakepasswordremembered" tabIndex={-1} aria-hidden="true" className="sr-only fixed -top-96" />

            <div>
              <label
                htmlFor="terminal-username"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="terminal-username"
                  name="terminal_account_username"
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUsername(val);
                    checkRememberedPassword(val.trim());
                  }}
                  placeholder={TERMINALS[selectedTerminal].placeholder}
                  className="w-full bg-obsidian-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="terminal-password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {isStationRemembered ? '✓ Saved for this device' : 'Password required'}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="terminal-password"
                  name="terminal_account_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setIsStationRemembered(false);
                  }}
                  placeholder={isStationRemembered ? '••••••••••••' : 'Enter password'}
                  className="w-full bg-obsidian-900/90 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Device Remember & Verification status */}
              <div className="flex items-center justify-between text-xs pt-2">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-400 hover:text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberStation}
                    onChange={(e) => setRememberStation(e.target.checked)}
                    className="rounded border-slate-700 bg-obsidian-900 text-gold-500 focus:ring-gold-400/40"
                  />
                  <span className="text-[11px]">Remember station on this device</span>
                </label>

                {isStationRemembered && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-mono">
                    <span>Verified</span>
                    <button
                      type="button"
                      onClick={forgetRememberedStation}
                      className="text-[10px] text-slate-500 hover:text-red-400 underline ml-1 cursor-pointer"
                    >
                      Forget
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 gold-button rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-obsidian-950" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to {currentTerminal.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500 font-mono flex items-center justify-center space-x-2">
            <span>Secure Station Verification</span>
            <span>&bull;</span>
            <span>Requires Authorized Password</span>
          </div>
        </div>
      </div>
    </div>
  );
}
