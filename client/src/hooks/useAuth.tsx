'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { UserDTO, AuthSessionUser } from '@goldscope/types';
import { api } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: UserDTO | null;
  session: AuthSessionUser | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadUser() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('goldscope_token') : null;
      if (!token) {
        setUser(null);
        setSession(null);
        setIsLoading(false);
        if (pathname && !pathname.startsWith('/login')) {
          router.push('/login');
        }
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
        setSession(data.session);
      } catch {
        localStorage.removeItem('goldscope_token');
        setUser(null);
        setSession(null);
        if (pathname && !pathname.startsWith('/login')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [pathname, router]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      localStorage.setItem('goldscope_token', res.token);
      setUser(res.user);
      setSession(res.session);

      if (res.user.role === 'TESTER') {
        router.push('/tester/queue');
      } else {
        router.push('/reception/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    localStorage.removeItem('goldscope_token');
    setUser(null);
    setSession(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
