'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSuccess('');
    setError('');

    if (newPassword.length < 8) {
      setError(t('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', 'New password must be at least 8 characters'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'New password and confirmation do not match'));
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/reset-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      if (res.ok) {
        setSuccess(t('تم تغيير كلمة المرور بنجاح', 'Password changed successfully'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.detail || data?.current_password?.[0] || data?.new_password?.[0] || t('حدث خطأ، تحقق من كلمة المرور الحالية', 'An error occurred. Check your current password.');
        setError(msg);
      }
    } catch {
      setError(t('تعذر الاتصال بالخادم', 'Could not connect to server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary">{t('الإعدادات', 'Settings')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('إدارة إعدادات حسابك', 'Manage your account settings')}</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-secondary">{t('تغيير كلمة المرور', 'Change Password')}</h2>
              <p className="text-xs text-muted-foreground">{t('اختر كلمة مرور قوية لحماية حسابك', 'Choose a strong password to protect your account')}</p>
            </div>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('كلمة المرور الحالية', 'Current Password')}
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
                  placeholder={t('أدخل كلمة المرور الحالية', 'Enter current password')}
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-secondary">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('كلمة المرور الجديدة', 'New Password')}
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
                  placeholder={t('8 أحرف على الأقل', 'At least 8 characters')}
                />
                <button type="button" onClick={() => setShowNew(s => !s)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-secondary">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('تأكيد كلمة المرور', 'Confirm New Password')}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
                  placeholder={t('أعد إدخال كلمة المرور الجديدة', 'Re-enter new password')}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-secondary">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ التغييرات', 'Save Changes')}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
