'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { Search, Plus, Pencil, PowerOff, Trash2, Package, AlertTriangle, ChevronLeft, ChevronRight, LayoutList, LayoutGrid } from 'lucide-react';
import api from '@/lib/axios';

interface ApiBrand {
  id: number;
  name: string;
}

interface ApiProductImage {
  id: number;
  image: string;
  sort_order: number;
  colour: string;
}

interface ApiProduct {
  id: number;
  name: string;
  brand: ApiBrand | null;
  category: 'glasses' | 'lens' | 'light_filters' | 'artificial_eyes';
  gender: 'male' | 'female' | 'kids' | 'unisex';
  frame_shape: 'square' | 'rectangle' | 'round' | 'cat_eye' | 'oval' | null;
  lens_type: 'medical' | 'sunglasses' | null;
  price: string;
  previous_price: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  description: string;
  images: ApiProductImage[];
  is_active: boolean;
}

type DisplayCategory = 'glasses_medical' | 'glasses_sunglasses' | 'lens' | 'light_filters' | 'artificial_eyes';

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  all:                { ar: 'الكل',             en: 'All'                  },
  glasses_medical:    { ar: 'نظارات النظر',     en: 'Prescription Glasses' },
  glasses_sunglasses: { ar: 'نظارات الشمس',    en: 'Sunglasses'           },
  lens:               { ar: 'عدسات',            en: 'Lenses'               },
  artificial_eyes:    { ar: 'عيون صناعية',     en: 'Artificial Eyes'      },
  light_filters:      { ar: 'فلاتر ضوئية',     en: 'Light Filters'        },
};

const PAGE_SIZE = 10;

const GENDER_LABELS: Record<string, { ar: string; en: string }> = {
  male:   { ar: 'رجالي',    en: 'Male'   },
  female: { ar: 'نسائي',    en: 'Female' },
  kids:   { ar: 'أطفال',    en: 'Kids'   },
  unisex: { ar: 'للجنسين',  en: 'Unisex' },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function AdminProductsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [toggleId, setToggleId] = useState<{ id: number; active: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchProducts = useCallback(async (currentPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: currentPage, page_size: PAGE_SIZE };
      if (searchTerm) params.name = searchTerm;
      if (categoryFilter === 'glasses_medical') {
        params.category = 'glasses';
        params.lens_type = 'medical';
      } else if (categoryFilter === 'glasses_sunglasses') {
        params.category = 'glasses';
        params.lens_type = 'sunglasses';
      } else if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      const { data } = await api.get('/api/catalog/products/', { params });
      setProducts(data.results);
      setTotalCount(data.count);
    } catch {
      setError(language === 'ar' ? 'فشل تحميل المنتجات' : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, categoryFilter, language]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter]);

  const toDisplayCategory = (p: ApiProduct): DisplayCategory => {
    if (p.category === 'glasses') {
      return p.lens_type === 'sunglasses' ? 'glasses_sunglasses' : 'glasses_medical';
    }
    return p.category as DisplayCategory;
  };

  const handleToggleActive = async () => {
    if (!toggleId) return;
    try {
      await api.post(`/api/catalog/products/${toggleId.id}/toggle-active/`);
    } finally {
      setToggleId(null);
      fetchProducts();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/catalog/products/${deleteId}/`);
    } finally {
      setDeleteId(null);
      fetchProducts();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold).length;

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const catLabel = (cat: string) => CATEGORY_LABELS[cat]?.[language] || cat;
  const productCatLabel = (p: ApiProduct) => catLabel(toDisplayCategory(p));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('إدارة المنتجات', 'Products Management')}</h1>
            <p className="text-muted-foreground text-sm">{t('إدارة جميع المنتجات', 'Manage all products')}</p>
          </div>
          <button
            onClick={() => router.push('/admin/products/new')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t('منتج جديد', 'New Product')}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('الإجمالي', 'Total'), value: totalCount, color: 'bg-blue-500' },
            { label: t('نظارات النظر', 'Prescription'), value: products.filter(p => p.category === 'glasses' && p.lens_type !== 'sunglasses').length, color: 'bg-blue-400' },
            { label: t('نظارات الشمس', 'Sunglasses'), value: products.filter(p => p.category === 'glasses' && p.lens_type === 'sunglasses').length, color: 'bg-yellow-500' },
            { label: t('مخزون منخفض', 'Low Stock'), value: lowStockCount, color: 'bg-red-500' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
              <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">{s.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Low stock alert */}
        {lowStockCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-800 font-medium">
              {t(`تحذير: ${lowStockCount} منتجات بمخزون منخفض`, `Warning: ${lowStockCount} products with low stock`)}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('البحث باسم المنتج...', 'Search by product name...')}
              className="w-full ps-10 pe-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full md:w-52 px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {(['all', 'glasses_medical', 'glasses_sunglasses', 'lens', 'artificial_eyes', 'light_filters'] as const).map(c => (
              <option key={c} value={c}>{catLabel(c)}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-gray-100'}`}
              title={t('قائمة', 'List')}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-gray-100'}`}
              title={t('شبكة', 'Grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    {[
                      { ar: 'المنتج', en: 'Product' },
                      { ar: 'الماركة', en: 'Brand' },
                      { ar: 'التصنيف', en: 'Category' },
                      { ar: 'الجنس', en: 'Gender' },
                      { ar: 'السعر', en: 'Price' },
                      { ar: 'المخزون', en: 'Stock' },
                      { ar: 'الحالة', en: 'Status' },
                      { ar: 'الإجراءات', en: 'Actions' },
                    ].map((h, i) => (
                      <th key={i} className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">
                        {t(h.ar, h.en)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                        {t('لا توجد منتجات', 'No products found')}
                      </td>
                    </tr>
                  ) : (
                    products.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`/admin/products/${p.id}`)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${!p.is_active ? 'opacity-50' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {p.images[0] ? (
                                <img src={resolveImageUrl(p.images[0].image)} alt="" className="w-full h-full object-cover"
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement)?.removeAttribute('style'); }}
                                />
                              ) : null}
                              <Package className="w-5 h-5 text-muted-foreground" style={p.images[0] ? { display: 'none' } : undefined} />
                            </div>
                            <span className="text-sm font-medium text-secondary">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{p.brand?.name ?? '—'}</td>
                        <td className="px-5 py-4 text-sm text-secondary">{productCatLabel(p)}</td>
                        <td className="px-5 py-4 text-sm text-secondary">{GENDER_LABELS[p.gender]?.[language] ?? p.gender}</td>
                        <td className="px-5 py-4 text-sm font-medium text-secondary">
                          {parseFloat(p.price).toLocaleString()} {t('ج.م', 'EGP')}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-sm font-medium ${p.stock_quantity <= p.low_stock_threshold ? 'text-red-600' : 'text-secondary'}`}>
                            {p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold && <AlertTriangle className="w-3.5 h-3.5 inline me-1" />}
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${p.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {p.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                          </span>
                        </td>
                        <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => router.push(`/admin/products/${p.id}/edit`)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title={t('تعديل', 'Edit')}>
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setToggleId({ id: p.id, active: p.is_active })}
                              className={`p-1.5 rounded-lg transition-colors ${p.is_active ? 'hover:bg-orange-50 text-orange-500' : 'hover:bg-green-50 text-green-600'}`}
                              title={p.is_active ? t('إيقاف', 'Deactivate') : t('تفعيل', 'Activate')}
                            >
                              <PowerOff className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title={t('حذف', 'Delete')}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t(`${totalCount} منتج — صفحة ${page} من ${totalPages}`, `${totalCount} products — Page ${page} of ${totalPages}`)}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {viewMode === 'grid' && (
          <div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                    <div className="h-52 bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">{t('لا توجد منتجات', 'No products found')}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/admin/products/${p.id}`)}
                    className={`bg-card rounded-2xl border border-border overflow-hidden cursor-pointer group transition-all hover:shadow-lg hover:-translate-y-0.5 ${!p.is_active ? 'opacity-60' : ''}`}
                  >
                    {/* Image */}
                    <div className="relative h-52 bg-gray-100 overflow-hidden">
                      {p.images[0] ? (
                        <img src={resolveImageUrl(p.images[0].image)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {/* Status badge */}
                      <div className="absolute top-2 start-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${p.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                          {p.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                        </span>
                      </div>
                      {/* Low stock badge */}
                      {p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold && (
                        <div className="absolute top-2 end-2">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{p.stock_quantity}
                          </span>
                        </div>
                      )}
                      {/* Action overlay */}
                      <div
                        onClick={e => e.stopPropagation()}
                        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex justify-end gap-2"
                      >
                        <button onClick={() => router.push(`/admin/products/${p.id}/edit`)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-blue-50 transition-colors" title={t('تعديل', 'Edit')}>
                          <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={() => setToggleId({ id: p.id, active: p.is_active })}
                          className={`w-8 h-8 bg-white rounded-full flex items-center justify-center transition-colors ${p.is_active ? 'hover:bg-orange-50' : 'hover:bg-green-50'}`}
                          title={p.is_active ? t('إيقاف', 'Deactivate') : t('تفعيل', 'Activate')}
                        >
                          <PowerOff className={`w-3.5 h-3.5 ${p.is_active ? 'text-orange-500' : 'text-green-600'}`} />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-red-50 transition-colors" title={t('حذف', 'Delete')}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-secondary truncate">{p.name}</p>
                      {p.brand && <p className="text-xs text-muted-foreground mt-0.5">{p.brand.name}</p>}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{productCatLabel(p)}</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{GENDER_LABELS[p.gender]?.[language] ?? p.gender}</span>
                      </div>
                      <p className="text-base font-bold text-primary mt-2">
                        {parseFloat(p.price).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{t('ج.م', 'EGP')}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t(`${totalCount} منتج — صفحة ${page} من ${totalPages}`, `${totalCount} products — Page ${page} of ${totalPages}`)}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toggle Active Confirm */}
      {toggleId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <PowerOff className={`w-12 h-12 mx-auto mb-3 ${toggleId.active ? 'text-orange-500' : 'text-green-500'}`} />
            <h3 className="text-lg font-bold text-secondary mb-2">
              {toggleId.active ? t('تأكيد إيقاف التشغيل', 'Confirm Deactivate') : t('تأكيد التفعيل', 'Confirm Activate')}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {toggleId.active
                ? t('سيتم إخفاء المنتج من المتجر.', 'The product will be hidden from the store.')
                : t('سيتم إظهار المنتج في المتجر.', 'The product will be visible in the store.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setToggleId(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleToggleActive}
                className={`px-4 py-2 text-white rounded-lg text-sm ${toggleId.active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {toggleId.active ? t('إيقاف', 'Deactivate') : t('تفعيل', 'Activate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-secondary mb-2">{t('تأكيد الحذف', 'Confirm Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t(
                'سيتم حذف المنتج نهائياً ولا يمكن التراجع عن هذا الإجراء.',
                'This product will be permanently deleted and cannot be undone.'
              )}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('حذف نهائي', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
