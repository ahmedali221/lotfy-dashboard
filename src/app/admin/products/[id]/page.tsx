'use client';

import { useState, useEffect, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '@/lib/axios';

interface ProductImage {
  id: number;
  image: string;
  sort_order: number;
  colour: string;
}

interface ApiProduct {
  id: number;
  name: string;
  brand: { id: number; name: string } | null;
  category: string;
  gender: string;
  frame_shape: string | null;
  lens_type: string;
  price: string;
  previous_price: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  description: string;
  is_active: boolean;
  images: ProductImage[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  lens:            { ar: 'عدسات',          en: 'Lenses'          },
  glasses:         { ar: 'نظارات',         en: 'Glasses'         },
  light_filters:   { ar: 'فلاتر ضوئية',    en: 'Light Filters'   },
  artificial_eyes: { ar: 'عيون اصطناعية',  en: 'Artificial Eyes' },
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

/** Fields that are relevant per category */
const CATEGORY_FIELDS: Record<string, { frame_shape: boolean; lens_type: boolean; gender: boolean }> = {
  glasses:         { frame_shape: true,  lens_type: true,  gender: true  },
  lens:            { frame_shape: false, lens_type: true,  gender: false },
  light_filters:   { frame_shape: false, lens_type: false, gender: false },
  artificial_eyes: { frame_shape: false, lens_type: false, gender: false },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start text-sm gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-secondary text-right">{value}</dd>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const len = product?.images?.length ?? 0;
    if (len < 2) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setImgIndex(i => (i + 1) % len);
      else setImgIndex(i => (i - 1 + len) % len);
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    api.get(`/api/catalog/products/${id}/`)
      .then(({ data }) => { setProduct(data); setImgIndex(0); })
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

  const fields = product ? (CATEGORY_FIELDS[product.category] ?? { frame_shape: false, lens_type: false, gender: true }) : null;
  const images = product?.images ?? [];
  const currentImage = images[imgIndex];

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
                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
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

        {product && fields && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

            {/* Image panel */}
            <div className="md:col-span-2 space-y-3">
              <div
                className="bg-card rounded-2xl border border-border overflow-hidden relative"
                style={{ touchAction: 'pan-y' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {currentImage ? (
                  <img
                    src={resolveImageUrl(currentImage.image)}
                    alt={product.name}
                    className="w-full h-72 object-cover"
                  />
                ) : (
                  <div className="w-full h-72 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Package className="w-16 h-16 opacity-20" />
                    <p className="text-sm">{t('لا توجد صورة', 'No image')}</p>
                  </div>
                )}
                {/* Active colour badge */}
                {currentImage?.colour && (
                  <div className="absolute bottom-3 start-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                    <span
                      className="w-3 h-3 rounded-full border border-white/50 shrink-0"
                      style={{ background: currentImage.colour }}
                    />
                    {currentImage.colour}
                  </div>
                )}
                {imgIndex === 0 && !currentImage?.colour && images.length > 0 && (
                  <div className="absolute bottom-3 start-3 bg-primary/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                    {t('الصورة الرئيسية', 'Thumbnail')}
                  </div>
                )}

                {/* Prev / Next arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIndex(i => (i - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setImgIndex(i => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIndex(i)}
                          className={`w-2 h-2 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setImgIndex(i)}
                      className={`shrink-0 flex flex-col items-center gap-1.5 rounded-xl border-2 transition-colors p-1 ${
                        i === imgIndex ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={resolveImageUrl(img.image)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {img.colour ? (
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0"
                            style={{ background: img.colour }}
                          />
                          <span className="text-[9px] text-muted-foreground leading-none truncate max-w-[52px]">
                            {img.colour}
                          </span>
                        </div>
                      ) : (
                        i === 0 && (
                          <span className="text-[9px] text-primary font-medium leading-none">
                            {t('رئيسية', 'Main')}
                          </span>
                        )
                      )}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {images.length > 0
                  ? t(`${images.length} صورة`, `${images.length} image${images.length !== 1 ? 's' : ''}`)
                  : t('لا توجد صور', 'No images')}
              </p>
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
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed border-t border-border pt-3">
                    {product.description}
                  </p>
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
                  {product.previous_price && (
                    <p className="text-xs text-muted-foreground line-through mt-1">
                      {parseFloat(product.previous_price).toLocaleString()} {t('ج.م', 'EGP')}
                    </p>
                  )}
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

              {/* Attributes — common + category-specific */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-sm font-semibold text-secondary mb-4">{t('التفاصيل', 'Details')}</h2>
                <dl className="space-y-3">
                  <DetailRow
                    label={t('رقم المنتج', 'Product ID')}
                    value={`#${product.id}`}
                  />
                  <DetailRow
                    label={t('التصنيف', 'Category')}
                    value={CATEGORY_LABELS[product.category]?.[language] ?? product.category}
                  />
                  {product.brand && (
                    <DetailRow
                      label={t('الماركة', 'Brand')}
                      value={product.brand.name}
                    />
                  )}

                  {/* Gender — only for categories that support it */}
                  {fields.gender && product.gender && (
                    <DetailRow
                      label={t('الجنس', 'Gender')}
                      value={GENDER_LABELS[product.gender]?.[language] ?? product.gender}
                    />
                  )}

                  {/* Frame Shape — glasses only */}
                  {fields.frame_shape && product.frame_shape && (
                    <DetailRow
                      label={t('شكل الإطار', 'Frame Shape')}
                      value={FRAME_SHAPE_LABELS[product.frame_shape]?.[language] ?? product.frame_shape}
                    />
                  )}

                  {/* Lens Type — glasses & lens */}
                  {fields.lens_type && product.lens_type && (
                    <DetailRow
                      label={t('نوع العدسة', 'Lens Type')}
                      value={product.lens_type}
                    />
                  )}

                  {/* Colours — per image, clickable to jump to that image */}
                  {images.some(img => img.colour) && (
                    <DetailRow
                      label={t('الألوان المتاحة', 'Available Colours')}
                      value={
                        <span className="flex flex-wrap gap-2 justify-end">
                          {images.filter(img => img.colour).map((img, i) => {
                            const imgIdx = images.indexOf(img);
                            const isActive = imgIdx === imgIndex;
                            return (
                              <button
                                key={img.id}
                                onClick={() => setImgIndex(imgIdx)}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${
                                  isActive
                                    ? 'border-primary bg-primary/10 text-primary font-medium'
                                    : 'border-border bg-gray-50 text-secondary hover:border-primary/50'
                                }`}
                              >
                                <span
                                  className="inline-block w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
                                  style={{ background: img.colour }}
                                />
                                {img.colour}
                              </button>
                            );
                          })}
                        </span>
                      }
                    />
                  )}
                </dl>
              </div>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
