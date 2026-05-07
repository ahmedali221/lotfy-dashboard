'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Eye, EyeOff, UserPlus, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';

export default function AddStaffPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
      return;
    }

    if (form.password.length < 8) {
      setError(t('يجب أن تكون كلمة المرور 8 أحرف على الأقل', 'Password must be at least 8 characters'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/staff/signup/', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      router.push('/admin/staff');
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: Record<string, string | string[]> };
      };
      const data = axiosErr.response?.data;
      if (data) {
        const firstMsg = Object.values(data)[0];
        setError(Array.isArray(firstMsg) ? firstMsg[0] : (firstMsg as string));
      } else {
        setError(t('حدث خطأ، يرجى المحاولة مرة أخرى', 'Something went wrong, please try again'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Back link */}
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-colors mb-6"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t('العودة للموظفين', 'Back to Staff')}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-secondary">
              {t('إضافة موظف جديد', 'Add New Staff')}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ms-13">
            {t('أنشئ حساب موظف جديد بصلاحيات لوحة التحكم', 'Create a new staff account with dashboard access')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('الاسم الكامل', 'Full Name')}
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('أحمد محمد', 'Ahmed Mohamed')}
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('البريد الإلكتروني', 'Email')}
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="staff@example.com"
                required
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('كلمة المرور', 'Password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                {t('تأكيد كلمة المرور', 'Confirm Password')}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm pe-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading
                ? t('جارٍ الإنشاء...', 'Creating...')
                : t('إنشاء حساب الموظف', 'Create Staff Account')}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
