'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft,
  Pencil,
  PowerOff,
  Package,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/axios';

interface ApiProduct {
  id: number;
  name: string;
  brand: { id: number; name: string } | null;
  category: string;
  gender: string;
  frame_shape: string | null;
  price: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  frame:     { ar: 'إطارات',      en: 'Frames'      },
  lens:      { ar: 'عدسات',       en: 'Lenses'      },
  accessory: { ar: 'إكسسوارات',   en: 'Accessories' },
};

const GENDER_LABELS: Record<string, { ar: string; en: string }> = {
  male:   { ar: 'رجالي',   en: 'Male'   },
  female: { ar: 'نسائي',   en: 'Female' },
  kids:   { ar: 'أطفال',   en: 'Kids'   },
  unisex: { ar: 'للجنسين', en: 'Unisex' },
};

const FRAME_SHAPE_LABELS: Record<string, { ar: string; en: string }> = {
  square:    { ar: 'مربع',    en: 'Square'    },
  rectangle: { ar: 'مستطيل', en: 'Rectangle' },
  round:     { ar: 'دائري',  en: 'Round'     },
  cat_eye:   { ar: 'كات آي', en: 'Cat Eye'   },
  oval:      { ar: 'بيضاوي', en: 'Oval'      },
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api.get(`/api/catalog/products/${id}/`)
      .then(({ data }) => setProduct(data))
      .catch(() => setError(t('فشل تحميل المنتج', 'Failed to load product')))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggle = async () => {
    if (!product) return;
    setToggling(true);
    try {
      const { data } = await api.post(`/api/catalog/products/${id}/toggle-active/`);
      setProduct(data);
    } finally {
      setToggling(false);
    }
  };

  const isLowStock = product
    ? product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold
    : false;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back + actions header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('العودة إلى المنتجات', 'Back to Products')}
          </button>

          {product && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/admin/products?edit=${product.id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                {t('تعديل', 'Edit')}
              </button>
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-60 ${
                  product.is_active
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                <PowerOff className="w-4 h-4" />
                {product.is_active ? t('إيقاف', 'Deactivate') : t('تفعيل', 'Activate')}
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="bg-card rounded-2xl border border-border p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-48 bg-gray-100 rounded-xl mt-4" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {product && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

            {/* Image panel */}
            <div className="md:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
              {product.image ? (
                <img
                  src={resolveImageUrl(product.image)}
                  alt={product.name}
                  className="w-full h-72 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-72 md:h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Package className="w-16 h-16 opacity-20" />
                  <p className="text-sm">{t('لا توجد صورة', 'No image')}</p>
                </div>
              )}
            </div>

            {/* Details panel */}
            <div className="md:col-span-3 space-y-4">

              {/* Name + status */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-secondary">{product.name}</h1>
                  <span className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border ${
                    product.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {product.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                  </span>
                </div>
                {product.brand && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                    <Tag className="w-3.5 h-3.5" />
                    {product.brand.name}
                  </div>
                )}
              </div>

              {/* Price + stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl border border-border p-5">
                  <p className="text-xs text-muted-foreground mb-1">{t('السعر', 'Price')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {parseFloat(product.price).toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ms-1">{t('ج.م', 'EGP')}</span>
                  </p>
                </div>
                <div className={`bg-card rounded-2xl border p-5 ${isLowStock ? 'border-red-200 bg-red-50' : 'border-border'}`}>
                  <p className="text-xs text-muted-foreground mb-1">{t('المخزون', 'Stock')}</p>
                  <div className="flex items-center gap-2">
                    {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                    <p className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-secondary'}`}>
                      {product.stock_quantity}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`حد التنبيه: ${product.low_stock_threshold}`, `Alert threshold: ${product.low_stock_threshold}`)}
                  </p>
                </div>
              </div>

              {/* Attributes */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-sm font-semibold text-secondary mb-4">{t('التفاصيل', 'Details')}</h2>
                <dl className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{t('التصنيف', 'Category')}</dt>
                    <dd className="font-medium text-secondary">
                      {CATEGORY_LABELS[product.category]?.[language] ?? product.category}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{t('الجنس', 'Gender')}</dt>
                    <dd className="font-medium text-secondary">
                      {GENDER_LABELS[product.gender]?.[language] ?? product.gender}
                    </dd>
                  </div>
                  {product.frame_shape && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t('شكل الإطار', 'Frame Shape')}</dt>
                      <dd className="font-medium text-secondary">
                        {FRAME_SHAPE_LABELS[product.frame_shape]?.[language] ?? product.frame_shape}
                      </dd>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">{t('الماركة', 'Brand')}</dt>
                      <dd className="font-medium text-secondary">{product.brand.name}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{t('رقم المنتج', 'Product ID')}</dt>
                    <dd className="font-medium text-secondary">#{product.id}</dd>
                  </div>
                </dl>
              </div>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
