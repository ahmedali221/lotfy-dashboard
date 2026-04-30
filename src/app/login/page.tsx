'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, Globe } from 'lucide-react';
import userApi from '@/lib/axios-user';

export default function LoginPage() {
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ar = language === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: tokens } = await userApi.post('/api/auth/login/', { email, password });

      localStorage.setItem('userToken', tokens.access);
      localStorage.setItem('userRefresh', tokens.refresh);

      const { data: user } = await userApi.get('/api/auth/me/');

      if (user.is_staff) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRefresh');
        setError(ar ? 'حسابات الموظفين تسجل الدخول من لوحة التحكم' : 'Staff accounts log in via the admin dashboard');
        setLoading(false);
        return;
      }

      localStorage.setItem('userInfo', JSON.stringify(user));
      document.cookie = `userToken=${tokens.access}; path=/`;

      router.push('/account');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } };
      const msg =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.non_field_errors?.[0];
      setError(msg || (ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password'));
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-secondary flex items-center justify-center p-4"
      dir={ar ? 'rtl' : 'ltr'}
    >
      <button
        onClick={toggleLanguage}
        className="absolute top-4 end-4 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
      >
        <Globe className="w-4 h-4" />
        {ar ? 'English' : 'عربي'}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">لطفي للبصريات</h1>
          <p className="text-primary text-sm">LOTFY OPTICAL</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-secondary mb-6 text-center">
            {ar ? 'تسجيل الدخول' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {ar ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {ar ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm pe-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg"
            >
              {loading ? (ar ? 'جارٍ الدخول...' : 'Signing in...') : (ar ? 'دخول' : 'Sign In')}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {ar ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              {ar ? 'إنشاء حساب' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
