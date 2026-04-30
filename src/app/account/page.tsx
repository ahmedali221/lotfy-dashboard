'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export default function AccountPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const ar = language === 'ar';

  useEffect(() => {
    const stored = localStorage.getItem('userInfo');
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRefresh');
    localStorage.removeItem('userInfo');
    document.cookie = 'userToken=; path=/; max-age=0';
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4" dir={ar ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-2">
          <span className="text-white font-bold text-2xl">L</span>
        </div>
        <h1 className="text-2xl font-bold text-secondary">{ar ? 'مرحباً،' : 'Welcome,'} {user.name}</h1>
        <p className="text-muted-foreground text-sm">{user.email}</p>
        {user.phone && <p className="text-muted-foreground text-sm">{user.phone}</p>}
        <button
          onClick={handleLogout}
          className="mt-4 w-full border border-destructive text-destructive hover:bg-red-50 py-3 rounded-xl font-medium transition-colors"
        >
          {ar ? 'تسجيل الخروج' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
