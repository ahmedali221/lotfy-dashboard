'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, Globe } from 'lucide-react';
import userApi from '@/lib/axios-user';

export default function SignupPage() {
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const ar = language === 'ar';

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const { data } = await userApi.post('/api/auth/signup/', form);

      localStorage.setItem('customerToken', data.access);
      localStorage.setItem('customerRefresh', data.refresh);
      localStorage.setItem('customerUser', JSON.stringify(data.user));
      document.cookie = `customerToken=${data.access}; path=/`;

      router.push('/account');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string | string[]> } };
      const data = axiosErr.response?.data;
      if (data) {
        const mapped: Record<string, string> = {};
        for (const [key, val] of Object.entries(data)) {
          mapped[key] = Array.isArray(val) ? val[0] : val;
        }
        setErrors(mapped);
      }
    }

    setLoading(false);
  };

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="text-xs text-destructive mt-1">{errors[field]}</p>
    ) : null;

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
            {ar ? 'إنشاء حساب' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {ar ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder={ar ? 'أحمد محمد' : 'John Doe'}
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              {fieldError('name')}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {ar ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="example@email.com"
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              {fieldError('email')}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {ar ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+20 1xx xxx xxxx"
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              {fieldError('phone')}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {ar ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  required
                  minLength={8}
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
              {fieldError('password')}
            </div>

            {errors.non_field_errors && (
              <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {errors.non_field_errors}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg mt-2"
            >
              {loading ? (ar ? 'جارٍ الإنشاء...' : 'Creating...') : (ar ? 'إنشاء حساب' : 'Create Account')}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {ar ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              {ar ? 'تسجيل الدخول' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
