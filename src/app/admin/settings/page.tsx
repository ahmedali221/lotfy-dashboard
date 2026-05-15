'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Lock, Eye, EyeOff, Monitor, Trash2, AlertTriangle, X, MapPin, Clock } from 'lucide-react';

const OPS_API = process.env.NEXT_PUBLIC_OPS_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────────
interface SessionDto {
  id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  deviceName: string;
  ipAddress: string | null;
  location: string | null;
  lastUsedAt: string;
  createdAt: string;
}

interface MeDto {
  id: string;
  permissions: string[];
}

interface TenantDto {
  id: string;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuthAndRedirect(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminRefresh');
  localStorage.removeItem('adminUser');
  document.cookie = 'adminToken=; path=/; max-age=0';
  router.push('/admin/login');
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
      const res = await fetch(`${OPS_API}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 204) {
        showToast(t('تم تحديث كلمة المرور بنجاح', 'Password updated successfully'), 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === 'Current password is incorrect.') {
          setCurrentPwError(t('كلمة المرور الحالية غير صحيحة', 'Current password is incorrect'));
        } else {
          showToast(t('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً', 'Session expired, please log in again'), 'error');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data?.error || t('حدث خطأ', 'An error occurred'), 'error');
      }
    } catch {
      showToast(t('تعذر الاتصال بالخادم', 'Could not connect to server'), 'error');
    } finally {
      setPwLoading(false);
    }
  };

  // ── Sessions state ─────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<MeDto | null>(null);
  const [canView, setCanView] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [tenants, setTenants] = useState<TenantDto[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  // Fetch /me to get permissions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${OPS_API}/api/v1/identity/users/me`, { headers: authHeaders() });
        if (!res.ok) return;
        const data: MeDto = await res.json();
        setCurrentUser(data);
        const perms: string[] = data.permissions ?? [];
        setCanView(perms.includes('sessions.view'));
        setCanDelete(perms.includes('sessions.delete'));
      } catch { /* network error — leave defaults */ }

      // Detect SuperAdmin from local storage (it bypasses all permission checks)
      try {
        const raw = localStorage.getItem('adminUser');
        setIsSuperAdmin(JSON.parse(raw ?? '{}')?.is_superuser === true);
      } catch { /* ignore */ }
    })();
  }, []);

  // Fetch tenants list for SuperAdmin filter
  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      try {
        const res = await fetch(`${OPS_API}/api/v1/identity/tenants`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : (data?.items ?? []));
      } catch { /* ignore */ }
    })();
  }, [isSuperAdmin]);

  // Fetch sessions whenever relevant state changes
  useEffect(() => {
    if (!canView && !isSuperAdmin) return;

    (async () => {
      setSessionsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
        if (isSuperAdmin && selectedTenantId) params.set('tenantId', selectedTenantId);

        const res = await fetch(`${OPS_API}/api/v1/auth/sessions?${params}`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setSessions(data.items ?? []);
        setTotalCount(data.totalCount ?? 0);
      } catch { /* ignore */ } finally {
        setSessionsLoading(false);
      }
    })();
  }, [canView, isSuperAdmin, page, selectedTenantId]);

  const revokeSession = (session: SessionDto) => {
    setConfirm({
      message: t('هل تريد إنهاء هذه الجلسة؟', 'Do you want to end this session?'),
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${OPS_API}/api/v1/auth/sessions/${session.id}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });

          if (res.status === 204) {
            setSessions(prev => prev.filter(s => s.id !== session.id));
            if (currentUser && session.userId === currentUser.id) {
              clearAuthAndRedirect(router);
            }
          } else if (res.status === 404) {
            showToast(t('الجلسة لم تعد نشطة', 'Session is no longer active'), 'error');
            setSessions(prev => prev.filter(s => s.id !== session.id));
          } else if (res.status === 403) {
            showToast(t('غير مصرح لك بهذا الإجراء', 'Access Denied'), 'error');
          }
        } catch {
          showToast(t('تعذر الاتصال بالخادم', 'Could not connect to server'), 'error');
        }
      },
    });
  };

  const revokeAllSessions = () => {
    setConfirm({
      message: t(
        'سيتم تسجيل خروج جميع المستخدمين من جميع أجهزتهم. هل أنت متأكد؟',
        'All users will be signed out from all their devices. Are you sure?'
      ),
      onConfirm: async () => {
        setConfirm(null);
        try {
          const params = new URLSearchParams();
          if (isSuperAdmin && selectedTenantId) params.set('tenantId', selectedTenantId);
          const qs = params.toString() ? `?${params}` : '';

          const res = await fetch(`${OPS_API}/api/v1/auth/sessions${qs}`, {
            method: 'DELETE',
            headers: authHeaders(),
          });

          if (res.status === 204) {
            clearAuthAndRedirect(router);
          } else {
            showToast(t('حدث خطأ', 'An error occurred'), 'error');
          }
        } catch {
          showToast(t('تعذر الاتصال بالخادم', 'Could not connect to server'), 'error');
        }
      },
    });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const showSessions = canView || isSuperAdmin;

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

        {/* ── Section 2: Active Sessions (permission-gated) ────────── */}
        {showSessions && (
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-secondary">{t('الجلسات النشطة', 'Active Sessions')}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t('جميع الأجهزة المتصلة بحسابك حالياً', 'All devices currently connected to your account')}
                  </p>
                </div>
              </div>

              {(canDelete || isSuperAdmin) && (
                <button
                  onClick={revokeAllSessions}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('إنهاء جميع الجلسات', 'End All Sessions')}
                </button>
              )}
            </div>

            {/* SuperAdmin tenant filter */}
            {isSuperAdmin && tenants.length > 0 && (
              <div className="mb-4">
                <select
                  value={selectedTenantId}
                  onChange={e => { setSelectedTenantId(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t('جميع المستأجرين', 'All Tenants')}</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sessions list */}
            {sessionsLoading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                {t('جارٍ التحميل...', 'Loading...')}
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                {t('لا توجد جلسات نشطة', 'No active sessions found')}
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-border gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Monitor className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium text-secondary truncate">
                          {session.deviceName}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {session.location ?? t('غير متاح', 'Unavailable')}
                        </span>
                        {session.ipAddress && <span>{session.ipAddress}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.lastUsedAt)}
                        </span>
                      </div>
                    </div>

                    {(canDelete || isSuperAdmin) && (
                      <button
                        onClick={() => revokeSession(session)}
                        className="flex-shrink-0 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {t('إنهاء', 'End')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
                <span>{t(`${totalCount} جلسة`, `${totalCount} sessions`)}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    {t('السابق', 'Prev')}
                  </button>
                  <span className="px-2">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    {t('التالي', 'Next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
