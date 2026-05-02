'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Pencil, Trash2, CreditCard, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/axios';

const PAGE_SIZE = 8;

interface PaymentMethod {
  id: number;
  name: string;
  number: string;
  is_active: boolean;
}

export default function AdminPaymentMethodsPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/orders/payment-methods/', { params: { page_size: 100 } });
      setMethods(data.results ?? data);
      setPage(1);
    } catch {
      setError(t('فشل تحميل طرق الدفع', 'Failed to load payment methods'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setNumber('');
    setIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setName(m.name);
    setNumber(m.number);
    setIsActive(m.is_active);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError(t('يرجى إدخال اسم طريقة الدفع', 'Please enter a payment method name'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: name.trim(), number: number.trim(), is_active: isActive };
      if (editingId) {
        await api.patch(`/api/orders/payment-methods/${editingId}/`, payload);
      } else {
        await api.post('/api/orders/payment-methods/', payload);
      }
      setModalOpen(false);
      fetchMethods();
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
    if (!deleteId) return;
    try {
      await api.delete(`/api/orders/payment-methods/${deleteId}/`);
    } finally {
      setDeleteId(null);
      fetchMethods();
    }
  };

  const handleToggle = async (m: PaymentMethod) => {
    setTogglingId(m.id);
    try {
      await api.patch(`/api/orders/payment-methods/${m.id}/`, { is_active: !m.is_active });
      fetchMethods();
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(methods.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = methods.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('طرق الدفع', 'Payment Methods')}</h1>
            <p className="text-muted-foreground text-sm">{t('إدارة طرق الدفع المتاحة للعملاء', 'Manage available payment methods for customers')}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t('طريقة دفع جديدة', 'New Payment Method')}
          </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-sm text-red-700">{error}</div>
          )}
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">#</th>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">
                  {t('الاسم', 'Name')}
                </th>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">
                  {t('الرقم / التفاصيل', 'Number / Details')}
                </th>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">
                  {t('الحالة', 'Status')}
                </th>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">
                  {t('الإجراءات', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : methods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t('لا توجد طرق دفع بعد', 'No payment methods yet')}
                  </td>
                </tr>
              ) : (
                <>
                  {slice.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-muted-foreground">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-5 py-4 text-sm font-medium text-secondary">{m.name}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{m.number || '—'}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggle(m)}
                          disabled={togglingId === m.id}
                          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                            m.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          } disabled:opacity-60`}
                          title={t('تبديل الحالة', 'Toggle status')}
                        >
                          {m.is_active
                            ? <><ToggleRight className="w-3.5 h-3.5" />{t('نشط', 'Active')}</>
                            : <><ToggleLeft className="w-3.5 h-3.5" />{t('معطل', 'Inactive')}</>
                          }
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title={t('تعديل', 'Edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(m.id)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title={t('حذف', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {totalPages > 1 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {t(
                              `${methods.length} طريقة — صفحة ${safePage} من ${totalPages}`,
                              `${methods.length} methods — Page ${safePage} of ${totalPages}`
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={safePage === totalPages}
                              className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={safePage === 1}
                              className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold text-secondary mb-5">
              {editingId ? t('تعديل طريقة الدفع', 'Edit Payment Method') : t('طريقة دفع جديدة', 'New Payment Method')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('الاسم', 'Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('مثال: فودافون كاش', 'e.g. Vodafone Cash')}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('الرقم / التفاصيل', 'Number / Details')}
                </label>
                <input
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('مثال: 01001234567', 'e.g. 01001234567')}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-secondary">{t('نشط', 'Active')}</span>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              >
                {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-secondary mb-2">{t('تأكيد الحذف', 'Confirm Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('سيتم حذف طريقة الدفع نهائياً.', 'This payment method will be permanently deleted.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
              >
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
