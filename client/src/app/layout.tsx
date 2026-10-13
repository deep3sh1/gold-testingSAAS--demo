import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../hooks/useAuth';
import { BranchProvider } from '../hooks/useBranch';
import { Navbar } from '../components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Aurum Touch Lab — Precious Metals Testing & Assay Platform',
  description: 'Enterprise Assay & Hallmark Testing SaaS Platform for Precious Metals Laboratories',
  icons: {
    icon: '/images/client-logo.jpeg',
    shortcut: '/images/client-logo.jpeg',
    apple: '/images/client-logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090b10] min-h-screen text-slate-100 antialiased selection:bg-gold-500 selection:text-obsidian-900">
        <AuthProvider>
          <BranchProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
                {children}
              </main>
            </div>
          </BranchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
