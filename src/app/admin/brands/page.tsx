'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import api from '@/lib/axios';
import { getApiError } from '@/lib/apiError';
import { useCursorPagination } from '@/lib/pagination';
import { CursorPager } from '@/components/admin/CursorPager';

const PAGE_SIZE = 5;

interface Brand {
  id: number;
  name: string;
}

export default function AdminBrandsPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pager = useCursorPagination();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBrands(await pager.fetchPage<Brand>('/api/catalog/brands/', { page_size: PAGE_SIZE }));
    } catch {
      setError(t('فشل تحميل الماركات', 'Failed to load brands'));
    } finally {
      setLoading(false);
    }
  }, [language, pager.fetchPage]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setName(brand.name);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError(t('يرجى إدخال اسم الماركة', 'Please enter a brand name'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await api.patch(`/api/catalog/brands/${editingId}/`, { name: name.trim() });
      } else {
        await api.post('/api/catalog/brands/', { name: name.trim() });
      }
      setModalOpen(false);
      fetchBrands();
    } catch (err: unknown) {
      setFormError(getApiError(err, language, { ar: 'فشل الحفظ، حاول مرة أخرى', en: 'Failed to save, please try again' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/catalog/brands/${deleteId}/`);
    } finally {
      setDeleteId(null);
      fetchBrands();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('إدارة الماركات', 'Brands Management')}</h1>
            <p className="text-muted-foreground text-sm">{t('إدارة ماركات المنتجات', 'Manage product brands')}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t('ماركة جديدة', 'New Brand')}
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
                  {t('اسم الماركة', 'Brand Name')}
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
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : brands.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t('لا توجد ماركات بعد', 'No brands yet')}
                  </td>
                </tr>
              ) : (
                <>
                    {brands.map((brand, idx) => (
                      <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm text-muted-foreground">{(pager.pageNumber - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-5 py-4 text-sm font-medium text-secondary">{brand.name}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEdit(brand)}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              title={t('تعديل', 'Edit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(brand.id)}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                              title={t('حذف', 'Delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </>
              )}
            </tbody>
          </table>
          <CursorPager
            className="p-4 border-t border-border"
            pageNumber={pager.pageNumber}
            hasNext={pager.hasNext}
            hasPrevious={pager.hasPrevious}
            onNext={pager.goNext}
            onPrevious={pager.goPrevious}
            disabled={loading}
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold text-secondary mb-5">
              {editingId ? t('تعديل الماركة', 'Edit Brand') : t('ماركة جديدة', 'New Brand')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('اسم الماركة', 'Brand Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('مثال: Ray-Ban', 'e.g. Ray-Ban')}
                  autoFocus
                />
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
              {t('سيتم حذف الماركة. المنتجات المرتبطة بها لن تُحذف.', 'The brand will be deleted. Linked products will not be affected.')}
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
