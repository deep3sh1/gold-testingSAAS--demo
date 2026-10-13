'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';

export interface BranchItem {
  label: string;
  slug: string;
  shortCode: string;
}

export const BRANCH_LIST: BranchItem[] = [
  { label: 'All Branches', slug: 'all', shortCode: 'ALL' },
  { label: 'Kalyan (West)', slug: 'kalyan', shortCode: 'KL-W' },
  { label: 'Kalyan (East)', slug: 'kalyan_east', shortCode: 'KL-E' },
  { label: 'Ulhasnagar', slug: 'ulhasnagar', shortCode: 'ULN' },
  { label: 'Dombivli (East)', slug: 'dombivali', shortCode: 'DOM' },
];

interface BranchContextType {
  selectedBranch: string;
  setSelectedBranch: (slug: string) => void;
  branchFilterQuery: string | undefined;
  currentBranchLabel: string;
  isAdmin: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ORGANIZATION_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [selectedBranch, setSelectedBranchState] = useState<string>('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aurum_admin_selected_branch') || localStorage.getItem('lab_admin_selected_branch');
      if (saved) {
        setSelectedBranchState(saved);
      }
    }
  }, []);

  const setSelectedBranch = (slug: string) => {
    setSelectedBranchState(slug);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurum_admin_selected_branch', slug);
    }
  };

  // When admin selects 'all', no query param is sent so backend returns all branches.
  // When admin selects a specific branch, it sends that branch.
  // When not admin, it defaults to user's assigned branch.
  const branchFilterQuery = isAdmin
    ? selectedBranch === 'all'
      ? undefined
      : selectedBranch
    : (user?.branch || undefined);

  const matched = BRANCH_LIST.find((b) => b.slug === (isAdmin ? selectedBranch : user?.branch));
  const currentBranchLabel = matched ? matched.label : (user?.branch?.toUpperCase() || 'All Branches');

  return (
    <BranchContext.Provider
      value={{
        selectedBranch: isAdmin ? selectedBranch : (user?.branch || 'kalyan'),
        setSelectedBranch,
        branchFilterQuery,
        currentBranchLabel,
        isAdmin,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextType {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
