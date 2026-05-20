'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, Eye, EyeOff, Monitor, AlertTriangle, X, Clock } from 'lucide-react';
import api from '@/lib/axios';

// ─── Types ──────────────────────────────────────────────────────
interface StaffDto {
  id: number;
  email: string;
  name: string;
  phone: string;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
}


// ─── Sub-components ─────────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {message}
      <button onClick={onClose} className="hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-sm text-secondary pt-1.5">{message}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  // Redirect non-superusers away from this page
  useEffect(() => {
    try {
      const isSuperuser = JSON.parse(localStorage.getItem('adminUser') ?? '{}')?.is_superuser === true;
      if (!isSuperuser) router.replace('/admin/dashboard');
    } catch { router.replace('/admin/dashboard'); }
  }, [router]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Confirm dialog
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Change Password state ──────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [currentPwError, setCurrentPwError] = useState('');
  const [newPwError, setNewPwError] = useState('');

  const PW_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPwError('');
    setNewPwError('');

    if (!PW_REGEX.test(newPassword)) {
      setNewPwError(t('8 أحرف على الأقل، حرف كبير وحرف صغير ورقم', 'Min 8 chars, uppercase, lowercase, and a number'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setNewPwError(t('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'New password and confirmation do not match'));
      return;
    }

    setPwLoading(true);
    try {
      await api.post('/api/auth/reset-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast(t('تم تحديث كلمة المرور بنجاح', 'Password updated successfully'), 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { current_password?: string[] } } })?.response?.status;
      const data = (err as { response?: { data?: { current_password?: string[] } } })?.response?.data;
      if (status === 400 && data?.current_password) {
        setCurrentPwError(t('كلمة المرور الحالية غير صحيحة', 'Current password is incorrect'));
      } else if (status === 401) {
        showToast(t('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً', 'Session expired, please log in again'), 'error');
      } else {
        showToast(t('تعذر الاتصال بالخادم', 'Could not connect to server'), 'error');
      }
    } finally {
      setPwLoading(false);
    }
  };

  // ── Staff sessions state ───────────────────────────────────────
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    setStaffLoading(true);
    api.get<{ results: StaffDto[] } | StaffDto[]>('/api/auth/staff/')
      .then(({ data }) => setStaff(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(() => {})
      .finally(() => setStaffLoading(false));
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  // ── Render ────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-secondary">{t('الأمان', 'Security')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('إدارة كلمة المرور والجلسات النشطة', 'Manage your password and active sessions')}
          </p>
        </div>

        {/* ── Section 1: Change Password ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-secondary">{t('تغيير كلمة المرور', 'Change Password')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('اختر كلمة مرور قوية لحماية حسابك', 'Choose a strong password to protect your account')}
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('كلمة المرور الحالية', 'Current Password')}
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => { setCurrentPassword(e.target.value); setCurrentPwError(''); }}
                  required
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10 ${
                    currentPwError ? 'border-red-400 bg-red-50' : 'border-border'
                  }`}
                  placeholder={t('أدخل كلمة المرور الحالية', 'Enter current password')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(s => !s)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-secondary"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {currentPwError && <p className="mt-1 text-xs text-red-600">{currentPwError}</p>}
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
                  onChange={e => { setNewPassword(e.target.value); setNewPwError(''); }}
                  required
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10 ${
                    newPwError ? 'border-red-400 bg-red-50' : 'border-border'
                  }`}
                  placeholder={t('8 أحرف على الأقل، حرف كبير وحرف صغير ورقم', '8+ chars, uppercase, lowercase, number')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(s => !s)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-secondary"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPwError && <p className="mt-1 text-xs text-red-600">{newPwError}</p>}
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
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-secondary"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {pwLoading ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ التغييرات', 'Save Changes')}
            </button>
          </form>
        </div>

        {/* ── Section 2: Dashboard Staff ───────────────────────────── */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-secondary">{t('الجلسات النشطة', 'Active Sessions')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('موظفو لوحة التحكم وآخر وقت تسجيل دخول لهم', 'Dashboard staff and their last login time')}
              </p>
            </div>
          </div>

          {staffLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              {t('جارٍ التحميل...', 'Loading...')}
            </div>
          ) : staff.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              {t('لا يوجد موظفون مسجلون', 'No staff members found')}
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-border"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-secondary truncate">{member.name}</span>
                      {member.is_superuser && (
                        <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-md font-medium">
                          {t('مشرف', 'Superuser')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {member.last_login
                        ? `${t('آخر دخول:', 'Last login:')} ${formatDate(member.last_login)}`
                        : t('لم يسجل دخولاً بعد', 'Never logged in')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
