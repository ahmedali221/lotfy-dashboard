'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, Globe } from 'lucide-react';
import api from '@/lib/axios';

export default function AdminLoginPage() {
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Get JWT tokens
      const { data: tokens } = await api.post('/api/auth/login/', { email, password });

      // Step 2: Store access token FIRST so the axios interceptor picks it up
      localStorage.setItem('adminToken', tokens.access);
      localStorage.setItem('adminRefresh', tokens.refresh);

      // Step 3: Verify the user is staff (interceptor now sends the correct token)
      const { data: user } = await api.get('/api/auth/staff/me/');

      if (!user.is_staff) {
        // Not staff — clean up tokens and show error
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefresh');
        setError(
          language === 'ar'
            ? 'هذا الحساب ليس لديه صلاحية الوصول للوحة التحكم'
            : 'This account does not have staff access'
        );
        setLoading(false);
        return;
      }

      // Step 4: Store user info
      localStorage.setItem('adminUser', JSON.stringify(user));

      const userType = user.is_superuser ? 'Superuser' : 'Staff';
      console.log(`[Auth] Logged in as: ${userType} — ${user.email} | is_staff: ${user.is_staff}, is_superuser: ${user.is_superuser}`);

      // Set cookie so middleware can protect routes server-side
      document.cookie = `adminToken=${tokens.access}; path=/`;

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } };
      const msg =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.non_field_errors?.[0];
      setError(
        msg ||
          (language === 'ar'
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : 'Invalid email or password')
      );
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen bg-secondary flex items-center justify-center p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 end-4 flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
      >
        <Globe className="w-4 h-4" />
        {language === 'ar' ? 'English' : 'عربي'}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">لطفي للبصريات</h1>
          <p className="text-primary text-sm">LOTFY OPTICAL — Admin</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-secondary mb-6 text-center">
            {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {language === 'ar' ? 'كلمة المرور' : 'Password'}
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
              {loading
                ? (language === 'ar' ? 'جارٍ الدخول...' : 'Signing in...')
                : (language === 'ar' ? 'دخول' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
