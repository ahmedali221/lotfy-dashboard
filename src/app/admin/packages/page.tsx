'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Pencil, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/axios';

const PAGE_SIZE = 10;

interface Package {
  id: number;
  name: string;
  description: string;
  points: number;
  price: string;
  activation_period_days: number;
  auction_cost: number;
  product_cost: number;
  is_available: boolean;
  created: string;
}

interface FormState {
  name: string;
  description: string;
  points: string;
  price: string;
  activation_period_days: string;
  auction_cost: string;
  product_cost: string;
  is_available: boolean;
}

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  points: '',
  price: '0',
  activation_period_days: '',
  auction_cost: '',
  product_cost: '',
  is_available: true,
});

export default function AdminPackagesPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/packages/', { params: { page_size: 100 } });
      setPackages(data.results ?? data);
      setPage(1);
    } catch {
      setError(t('فشل تحميل الباقات', 'Failed to load packages'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description,
      points: String(pkg.points),
      price: pkg.price,
      activation_period_days: String(pkg.activation_period_days),
      auction_cost: String(pkg.auction_cost),
      product_cost: String(pkg.product_cost),
      is_available: pkg.is_available,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError(t('يرجى إدخال اسم الباقة', 'Please enter a package name'));
      return;
    }
    if (!form.points || !form.activation_period_days || !form.auction_cost || !form.product_cost) {
      setFormError(t('يرجى ملء جميع الحقول المطلوبة', 'Please fill all required fields'));
      return;
    }
    const points = parseInt(form.points);
    const auctionCost = parseInt(form.auction_cost);
    const productCost = parseInt(form.product_cost);
    if (auctionCost > points || productCost > points) {
      setFormError(t(
        'تكلفة المزاد وتكلفة المنتج يجب ألا تتجاوز إجمالي النقاط',
        'Auction cost and product cost must not exceed total points',
      ));
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      points,
      price: form.price,
      activation_period_days: parseInt(form.activation_period_days),
      auction_cost: auctionCost,
      product_cost: productCost,
      is_available: form.is_available,
    };
    try {
      if (editingId) {
        await api.patch(`/api/packages/manager/packages/${editingId}/`, payload);
      } else {
        await api.post('/api/packages/', payload);
      }
      setModalOpen(false);
      fetchPackages();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      const data = axiosErr.response?.data;
      const firstMsg = data ? (Object.values(data).flat()[0] as string) : null;
      setFormError(firstMsg || t('فشل الحفظ، حاول مرة أخرى', 'Failed to save, please try again'));
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const totalPages = Math.max(1, Math.ceil(packages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = packages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">
              {t('إدارة الباقات', 'Packages Management')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('إنشاء وتعديل خطط اشتراك البائعين', 'Create and manage seller subscription plans')}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t('باقة جديدة', 'New Package')}
          </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-sm text-red-700">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">#</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الاسم', 'Name')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('النقاط', 'Points')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('السعر', 'Price')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('تكلفة المزاد', 'Auction Cost')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('تكلفة المنتج', 'Product Cost')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('المدة (أيام)', 'Period (days)')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الحالة', 'Status')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : packages.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {t('لا توجد باقات بعد', 'No packages yet')}
                    </td>
                  </tr>
                ) : (
                  <>
                    {slice.map((pkg, idx) => (
                      <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {(safePage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-secondary">{pkg.name}</div>
                          {pkg.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pkg.description}</div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-secondary">{pkg.points}</td>
                        <td className="px-5 py-4 text-sm text-secondary">{pkg.price}</td>
                        <td className="px-5 py-4 text-sm text-secondary">{pkg.auction_cost}</td>
                        <td className="px-5 py-4 text-sm text-secondary">{pkg.product_cost}</td>
                        <td className="px-5 py-4 text-sm text-secondary">{pkg.activation_period_days}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            pkg.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {pkg.is_available ? t('متاح', 'Available') : t('مخفي', 'Hidden')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openEdit(pkg)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title={t('تعديل', 'Edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {totalPages > 1 && (
                      <tr>
                        <td colSpan={9} className="px-5 py-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {t(
                                `${packages.length} باقة — صفحة ${safePage} من ${totalPages}`,
                                `${packages.length} packages — Page ${safePage} of ${totalPages}`,
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
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-8">
            <h3 className="text-xl font-bold text-secondary mb-5">
              {editingId ? t('تعديل الباقة', 'Edit Package') : t('باقة جديدة', 'New Package')}
            </h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('اسم الباقة', 'Package Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={setField('name')}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('مثال: الباقة الذهبية', 'e.g. Gold Plan')}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('الوصف', 'Description')}
                </label>
                <textarea
                  value={form.description}
                  onChange={setField('description')}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={t('وصف اختياري للباقة', 'Optional description')}
                />
              </div>

              {/* Points + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('النقاط الإجمالية', 'Total Points')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.points}
                    onChange={setField('points')}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('السعر', 'Price')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={setField('price')}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Auction Cost + Product Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('تكلفة إنشاء المزاد (نقاط)', 'Auction Creation Cost (pts)')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.auction_cost}
                    onChange={setField('auction_cost')}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('تكلفة نشر المنتج (نقاط)', 'Product Listing Cost (pts)')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.product_cost}
                    onChange={setField('product_cost')}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="5"
                  />
                </div>
              </div>

              {/* Activation Period + Availability */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('مدة الصلاحية (أيام)', 'Activation Period (days)')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.activation_period_days}
                    onChange={setField('activation_period_days')}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="30"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.is_available}
                      onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium text-secondary">
                      {t('متاح للبائعين', 'Visible to sellers')}
                    </span>
                  </label>
                </div>
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
                className="px-5 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
