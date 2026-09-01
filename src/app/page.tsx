'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginPage from './login/page';

export default function RootPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('kasir_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.role === 'owner') {
            router.replace('/dashboard');
            return;
          } else if (parsed.role === 'kasir') {
            router.replace('/kasir');
            return;
          }
        } catch { }
      }
      setIsChecking(false);
    }
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#eb4b2b] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <LoginPage />;
}
