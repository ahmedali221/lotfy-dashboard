'use client';

import { useEffect, useMemo, useState } from 'react';
import { Percent, Search, X } from 'lucide-react';
import api from '@/lib/axios';
import { fetchAllPages } from '@/lib/pagination';
import { applyDiscount, basePriceOf, discountPayload, discountPctOf, isValidDiscountPct } from '@/lib/discount';

interface DiscountProduct {
  id: number;
  name: string;
  category: 'glasses' | 'lens' | 'light_filters' | 'artificial_eyes';
  lens_type: 'medical' | 'sunglasses' | null;
  price: string;
  previous_price: string | null;
  is_active: boolean;
  images: { id: number; image: string; sort_order: number }[];
}

interface Props {
  language: 'ar' | 'en';
  categoryLabels: Record<string, { ar: string; en: string }>;
  onClose: () => void;
  onApplied: () => void;
}

const BATCH_SIZE = 5;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const firstImageOf = (p: DiscountProduct) => {
  const url = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image;
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const displayCategory = (p: DiscountProduct) =>
  p.category === 'glasses' ? (p.lens_type === 'sunglasses' ? 'glasses_sunglasses' : 'glasses_medical') : p.category;

export function BulkDiscountModal({ language, categoryLabels, onClose, onApplied }: Props) {
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [products, setProducts] = useState<DiscountProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pctInput, setPctInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchAllPages<DiscountProduct>('/api/catalog/products/')
      .then(setProducts)
      .catch(() => setError(t('فشل تحميل المنتجات', 'Failed to load products')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = pctInput === '' ? NaN : Number(pctInput);
  const pctValid = isValidDiscountPct(pct);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      (category === 'all' || displayCategory(p) === category) &&
      (!q || p.name.toLowerCase().includes(q))
    );
  }, [products, search, category]);

  const allVisibleSelected = visible.length > 0 && visible.every(p => selected.has(p.id));

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const selectAllVisible = () =>
    setSelected(prev => new Set([...prev, ...visible.map(p => p.id)]));

  const deselectAllVisible = () =>
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(p => next.delete(p.id));
      return next;
    });

  const handleApply = async () => {
    if (!pctValid || selected.size === 0) return;
    setApplying(true);
    setError('');
    const targets = products.filter(p => selected.has(p.id));
    const failed: string[] = [];
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(p => api.patch(`/api/catalog/products/${p.id}/`, discountPayload(basePriceOf(p), pct)))
      );
      results.forEach((r, j) => { if (r.status === 'rejected') failed.push(batch[j].name); });
    }
    setApplying(false);
    onApplied();
    if (failed.length) {
      setError(t(`فشل تطبيق الخصم على: ${failed.join('، ')}`, `Failed to apply discount to: ${failed.join(', ')}`));
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[88rem] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-secondary">{t('تطبيق خصم', 'Apply Discount')}</h3>
          </div>
          <button onClick={onClose} disabled={applying} className="p-1.5 hover:bg-gray-100 rounded-lg text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Percent + filters */}
        <div className="p-5 space-y-3 border-b border-border">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('نسبة الخصم %', 'Discount %')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number" min="0" max="99" step="0.01"
              value={pctInput}
              onChange={e => setPctInput(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('مثال: 15', 'e.g. 15')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('الخصم يُحسب من السعر الأساسي. اكتب 0 لإلغاء الخصم.', 'Discount is applied to the base price. Enter 0 to remove the discount.')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('البحث باسم المنتج...', 'Search by product name...')}
                className="w-full ps-10 pe-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="sm:w-52 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.keys(categoryLabels).map(c => (
                <option key={c} value={c}>{categoryLabels[c][language]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t(`تم اختيار ${selected.size} منتج`, `${selected.size} selected`)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                disabled={visible.length === 0 || allVisibleSelected}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-primary rounded-lg font-medium"
              >
                {t('تحديد الكل', 'Select all')}
              </button>
              <button
                type="button"
                onClick={deselectAllVisible}
                disabled={!visible.some(p => selected.has(p.id))}
                className="px-3 py-1.5 border border-border hover:bg-gray-100 disabled:opacity-50 rounded-lg"
              >
                {t('إلغاء تحديد الكل', 'Deselect all')}
              </button>
            </div>
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('لا توجد منتجات', 'No products found')}</p>
          ) : (
            visible.map(p => {
              const base = basePriceOf(p);
              const currentPct = discountPctOf(p);
              const checked = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 ${!p.is_active ? 'opacity-60' : ''}`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="w-4 h-4 accent-primary" />
                  <div className="w-20 h-20 shrink-0 rounded-lg border border-border bg-gray-50 overflow-hidden flex items-center justify-center">
                    {firstImageOf(p) ? (
                      <img src={firstImageOf(p)!} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{t('بدون صورة', 'No image')}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabels[displayCategory(p)]?.[language]}
                      {currentPct > 0 && ` · ${t(`خصم حالي ${currentPct}%`, `current ${currentPct}% off`)}`}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2 text-sm shrink-0">
                    {checked && pctValid ? (
                      <>
                        <span className="text-muted-foreground line-through">{parseFloat(p.price).toLocaleString()}</span>
                        <span className="font-semibold text-primary">{parseFloat(applyDiscount(base, pct)).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="text-secondary">{parseFloat(p.price).toLocaleString()}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{t('ج.م', 'EGP')}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border space-y-3">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
            >
              {t('إلغاء', 'Cancel')}
            </button>
            <button
              onClick={handleApply}
              disabled={applying || !pctValid || selected.size === 0}
              className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
            >
              {applying
                ? t('جارٍ التطبيق...', 'Applying...')
                : t(`تطبيق على ${selected.size} منتج`, `Apply to ${selected.size} products`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
