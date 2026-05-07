'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowLeft, ArrowRight, Users, Pencil, Trash2, Save, X } from 'lucide-react';
import api from '@/lib/axios';

interface StaffMember {
  id: number;
  name: string;
  email: string;
  is_superuser: boolean;
  is_staff: boolean;
}

export default function StaffDetailPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const staffId = params?.id as string;
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [isSuperuser, setIsSuperuser] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser');
      setIsSuperuser(JSON.parse(raw ?? '{}')?.is_superuser === true);
    } catch { setIsSuperuser(false); }
  }, []);

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchStaff = () => {
    setLoading(true);
    setError('');
    api.get(`/api/auth/staff/${staffId}/`)
      .then(({ data }) => setStaff(data))
      .catch(() => setError(t('فشل تحميل بيانات الموظف', 'Failed to load staff data')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, [staffId]);

  const openEdit = () => {
    if (!staff) return;
    setForm({ name: staff.name, email: staff.email });
    setFormError('');
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError(t('يرجى ملء جميع الحقول', 'Please fill all fields'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.patch(`/api/auth/staff/${staffId}/`, {
        name: form.name.trim(),
        email: form.email.trim(),
      });
      setEditMode(false);
      fetchStaff();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const data = axiosErr.response?.data;
      const firstMsg = data ? Object.values(data).flat()[0] : null;
      setFormError(firstMsg || t('فشل الحفظ، حاول مرة أخرى', 'Failed to save, please try again'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/auth/staff/${staffId}/`);
      router.push('/admin/staff');
    } catch {
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Back link */}
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-colors mb-6"
        >
          {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {t('العودة للموظفين', 'Back to Staff')}
        </Link>

        {loading ? (
          <div className="bg-card rounded-2xl border border-border p-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm">{error}</div>
        ) : staff ? (
          <>
            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary leading-tight">{staff.name}</h1>
                  <p className="text-sm text-muted-foreground">{staff.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSuperuser && (
                  editMode ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-gray-50 rounded-lg text-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                        {t('إلغاء', 'Cancel')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={openEdit}
                      className="flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      {t('تعديل', 'Edit')}
                    </button>
                  )
                )}
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('حذف', 'Delete')}
                </button>
              </div>
            </div>

            {/* Detail card */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-8 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t('الاسم الكامل', 'Full Name')}
                </label>
                {editMode ? (
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                ) : (
                  <p className="text-secondary font-medium">{staff.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t('البريد الإلكتروني', 'Email')}
                </label>
                {editMode ? (
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                ) : (
                  <p className="text-secondary font-medium">{staff.email}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t('الدور', 'Role')}
                </label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  staff.is_superuser
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {staff.is_superuser ? t('مدير عام', 'Super Admin') : t('موظف', 'Staff')}
                </span>
              </div>

              {formError && (
                <p className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {formError}
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Delete confirm modal */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-secondary mb-2">{t('تأكيد الحذف', 'Confirm Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('سيتم حذف حساب الموظف نهائياً. لا يمكن التراجع عن هذا الإجراء.', 'The staff account will be permanently deleted. This action cannot be undone.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg text-sm"
              >
                {deleting ? t('جارٍ الحذف...', 'Deleting...') : t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
