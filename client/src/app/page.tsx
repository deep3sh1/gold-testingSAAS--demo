'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'TESTER') {
        router.push('/tester/queue');
      } else {
        router.push('/reception/dashboard');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl shadow-gold-500/20 ring-1 ring-gold-400/40">
          <img
            src="/images/client-logo.jpeg"
            alt="Aurum Touch Lab Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-gold-500/40 border-t-gold-400 animate-spin" />
        <p className="text-sm font-mono text-gold-400/80">Loading AURUM TOUCH LAB...</p>
      </div>
    </div>
  );
}
