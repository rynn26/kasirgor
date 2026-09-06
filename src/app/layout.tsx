import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';
import { CartAutoSaveGuard } from '@/components/common/CartAutoSaveGuard';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  themeColor: '#eb4b2b',
};

export const metadata: Metadata = {
  title: 'KASIR GOR - Sistem Kasir Penjualan & POS Retail Olahraga',
  description: 'Aplikasi kasir penjualan produk perlengkapan olahraga dan arena lapangan GOR',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kasir GOR',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-[#f8fafc] text-slate-800 font-sans flex overflow-hidden selection:bg-[#b92b10] selection:text-white">
        <AppShell>
          <CartAutoSaveGuard />
          {children}
        </AppShell>
      </body>
    </html>
  );
}
