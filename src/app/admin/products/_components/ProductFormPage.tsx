'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, XCircle, Star, Plus, ImageIcon, Palette,
} from 'lucide-react';
import api from '@/lib/axios';

interface ApiBrand { id: number; name: string; }

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
}

type DisplayCategory = 'glasses_medical' | 'glasses_sunglasses' | 'lens' | 'light_filters' | 'artificial_eyes';

interface ProductForm {
  name: string;
  brand: number | '';
  category: DisplayCategory;
  gender: 'male' | 'female' | 'kids' | 'unisex';
  frame_shape: 'square' | 'rectangle' | 'round' | 'cat_eye' | 'oval' | '';
  price: string;
  previous_price: string;
  stock_quantity: number | '';
  low_stock_threshold: number | '';
  description: string;
}

const EMPTY_FORM: ProductForm = {
  name: '', brand: '', category: 'glasses_medical', gender: 'unisex',
  frame_shape: '', price: '', previous_price: '', stock_quantity: '',
  low_stock_threshold: 5, description: '',
};

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  glasses_medical:    { ar: 'نظارات النظر',  en: 'Prescription Glasses' },
  glasses_sunglasses: { ar: 'نظارات الشمس', en: 'Sunglasses'            },
  lens:               { ar: 'عدسات',         en: 'Lenses'               },
  artificial_eyes:    { ar: 'عيون صناعية',  en: 'Artificial Eyes'      },
  light_filters:      { ar: 'فلاتر ضوئية',  en: 'Light Filters'        },
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface ExistingImage extends ApiProductImage {}
interface NewImage { file: File; preview: string; colour: string; }

interface Props {
  productId?: number;
}

export default function ProductFormPage({ productId }: Props) {
  const { language } = useLanguage();
  const router = useRouter();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const isEdit = !!productId;

  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [formError, setFormError] = useState('');

  // Thumbnail: exactly one image (index 0), separate from the rest
  const [thumbExisting, setThumbExisting] = useState<ExistingImage | null>(null);
  const [thumbNew, setThumbNew] = useState<NewImage | null>(null);
  const [thumbDeleted, setThumbDeleted] = useState(false);

  // Additional colour images
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const extraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/api/catalog/brands/', { params: { page_size: 100 } })
      .then(({ data }) => setBrands(data.results ?? data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/catalog/products/${productId}/`)
      .then(({ data }: { data: ApiProduct }) => {
        const p = data;
        const displayCat: DisplayCategory =
          p.category === 'glasses'
            ? p.lens_type === 'sunglasses' ? 'glasses_sunglasses' : 'glasses_medical'
            : p.category as DisplayCategory;

        setForm({
          name: p.name,
          brand: p.brand?.id ?? '',
          category: displayCat,
          gender: p.gender,
          frame_shape: p.frame_shape ?? '',
          price: p.price,
          previous_price: p.previous_price ?? '',
          stock_quantity: p.stock_quantity,
          low_stock_threshold: p.low_stock_threshold,
          description: p.description ?? '',
        });

        const [first, ...rest] = p.images ?? [];
        setThumbExisting(first ?? null);
        setExistingImages(rest);
      })
      .finally(() => setLoadingProduct(false));
  }, [productId, isEdit]);

  // ── Thumbnail handlers ──────────────────────────────────────────────────────

  const handleThumbFile = (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    if (thumbNew) URL.revokeObjectURL(thumbNew.preview);
    setThumbNew({ file, preview: URL.createObjectURL(file), colour: thumbNew?.colour ?? '' });
    // If there was an existing thumb and we're replacing it, mark for deletion
    if (thumbExisting && !thumbDeleted) {
      setDeletedImageIds(prev => [...prev, thumbExisting.id]);
      setThumbExisting(null);
      setThumbDeleted(true);
    }
  };

  const removeThumb = () => {
    if (thumbNew) {
      URL.revokeObjectURL(thumbNew.preview);
      setThumbNew(null);
    }
    if (thumbExisting) {
      setDeletedImageIds(prev => [...prev, thumbExisting.id]);
      setThumbExisting(null);
      setThumbDeleted(true);
    }
  };

  // ── Extra image handlers ────────────────────────────────────────────────────

  const handleAddExtraImages = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({ file, preview: URL.createObjectURL(file), colour: '' }));
    setNewImages(prev => [...prev, ...added]);
  };

  const removeExistingImage = (id: number) => {
    setDeletedImageIds(prev => [...prev, id]);
    setExistingImages(prev => prev.filter(img => img.id !== id));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateExistingColour = (id: number, colour: string) =>
    setExistingImages(prev => prev.map(img => img.id === id ? { ...img, colour } : img));

  const updateNewColour = (index: number, colour: string) =>
    setNewImages(prev => prev.map((img, i) => i === index ? { ...img, colour } : img));

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || form.stock_quantity === '') {
      setFormError(t('يرجى ملء جميع الحقول المطلوبة', 'Please fill all required fields'));
      return;
    }
    const hasThumb = thumbExisting || thumbNew;
    if (!hasThumb) {
      setFormError(t('يرجى إضافة الصورة الرئيسية للمنتج', 'Please add a thumbnail image'));
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const isGlasses = form.category === 'glasses_medical' || form.category === 'glasses_sunglasses';
      const apiCategory = isGlasses ? 'glasses' : form.category;
      const apiLensType = form.category === 'glasses_medical' ? 'medical'
        : form.category === 'glasses_sunglasses' ? 'sunglasses' : '';

      const formData = new FormData();
      formData.append('name', form.name.trim());
      if (form.brand !== '') formData.append('brand', String(form.brand));
      formData.append('category', apiCategory);
      formData.append('gender', form.gender);
      formData.append('frame_shape', isGlasses && form.frame_shape ? form.frame_shape : '');
      formData.append('price', form.price);
      if (form.previous_price) formData.append('previous_price', form.previous_price);
      formData.append('stock_quantity', String(Number(form.stock_quantity)));
      if (form.low_stock_threshold !== '') formData.append('low_stock_threshold', String(Number(form.low_stock_threshold)));
      formData.append('lens_type', apiLensType);
      formData.append('description', form.description);

      let productId_: number;
      if (isEdit && productId) {
        await api.patch(`/api/catalog/products/${productId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        productId_ = productId;
      } else {
        const { data } = await api.post('/api/catalog/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        productId_ = data.id;
      }

      // Delete removed images
      await Promise.all(
        deletedImageIds.map(id =>
          api.delete(`/api/catalog/products/${productId_}/images/${id}/`)
        )
      );

      // Patch colour on existing thumbnail (it stays at sort_order 0)
      if (thumbExisting) {
        const patch = new FormData();
        patch.append('colour', '');
        await api.patch(`/api/catalog/products/${productId_}/images/${thumbExisting.id}/`, patch, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Patch colour on existing extra images
      await Promise.all(
        existingImages.map(img => {
          const patch = new FormData();
          patch.append('colour', img.colour ?? '');
          return api.patch(`/api/catalog/products/${productId_}/images/${img.id}/`, patch, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })
      );

      // Upload new thumbnail first (sort_order 0)
      if (thumbNew) {
        const d = new FormData();
        d.append('image', thumbNew.file);
        d.append('sort_order', '0');
        await api.post(`/api/catalog/products/${productId_}/images/`, d, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Upload new extra images sequentially
      for (const img of newImages) {
        const d = new FormData();
        d.append('image', img.file);
        if (img.colour) d.append('colour', img.colour);
        await api.post(`/api/catalog/products/${productId_}/images/`, d, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      router.push('/admin/products');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const data = axiosErr.response?.data;
      const firstMsg = data ? Object.values(data).flat()[0] : null;
      setFormError(firstMsg || t('فشل الحفظ، حاول مرة أخرى', 'Failed to save, please try again'));
    } finally {
      setSaving(false);
    }
  };

  const thumbSrc = thumbNew?.preview ?? (thumbExisting ? resolveImageUrl(thumbExisting.image) : null);
  const isGlasses = form.category === 'glasses_medical' || form.category === 'glasses_sunglasses';

  if (loadingProduct) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-96 bg-gray-100 rounded-2xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/products')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-secondary">
                {isEdit ? t('تعديل المنتج', 'Edit Product') : t('منتج جديد', 'New Product')}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isEdit ? t('تحديث بيانات المنتج', 'Update product details') : t('أدخل بيانات المنتج الجديد', 'Enter new product details')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/products')}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-100 transition-colors"
            >
              {t('إلغاء', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ المنتج', 'Save Product')}
            </button>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {formError}
          </div>
        )}

        {/* ── Section 1: Thumbnail ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-secondary">{t('الصورة الرئيسية', 'Thumbnail Image')}</h2>
            <span className="text-red-500 text-sm">*</span>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {t('هذه الصورة تظهر في قائمة المنتجات وكصورة رئيسية للمنتج', 'This image appears in the product list and as the main product image')}
          </p>

          <input
            ref={thumbInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { handleThumbFile(e.target.files); e.target.value = ''; }}
          />

          {thumbSrc ? (
            <div className="flex items-start gap-5">
              <div className="relative shrink-0 w-48 h-48 rounded-xl overflow-hidden border-2 border-primary bg-gray-50 group">
                <img src={thumbSrc} alt="thumbnail" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                    title={t('تغيير', 'Change')}
                  >
                    <Upload className="w-4 h-4 text-secondary" />
                  </button>
                  <button
                    type="button"
                    onClick={removeThumb}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                    title={t('حذف', 'Remove')}
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <span className="absolute top-2 start-2 flex items-center gap-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                  <Star className="w-2.5 h-2.5" />
                  {t('رئيسية', 'Thumbnail')}
                </span>
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <p className="text-sm font-medium text-secondary">{t('الصورة الرئيسية محددة', 'Thumbnail set')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('مرر على الصورة لتغييرها أو حذفها', 'Hover over the image to change or remove it')}
                </p>
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t('تغيير الصورة', 'Change image')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              className="w-full h-48 rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-3 transition-colors text-muted-foreground hover:text-primary group"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{t('اضغط لرفع الصورة الرئيسية', 'Click to upload thumbnail')}</p>
                <p className="text-xs mt-0.5">{t('PNG, JPG, WEBP', 'PNG, JPG, WEBP')}</p>
              </div>
            </button>
          )}
        </div>

        {/* ── Section 2: Colour Variants ──────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-secondary">{t('صور الألوان', 'Colour Images')}</h2>
              <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                {existingImages.length + newImages.length} {t('صورة', 'images')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => extraInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('إضافة صورة', 'Add Image')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {t('كل صورة تمثل لون مختلف للمنتج — أدخل اسم اللون بجانب كل صورة', 'Each image represents a different product colour — enter the colour name next to each image')}
          </p>

          <input
            ref={extraInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { handleAddExtraImages(e.target.files); e.target.value = ''; }}
          />

          {existingImages.length === 0 && newImages.length === 0 ? (
            <button
              type="button"
              onClick={() => extraInputRef.current?.click()}
              className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors text-muted-foreground hover:text-primary group"
            >
              <Palette className="w-6 h-6" />
              <p className="text-sm">{t('أضف صور الألوان المتاحة للمنتج', 'Add available colour images for this product')}</p>
            </button>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-[80px_1fr] gap-3 px-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('الصورة', 'Image')}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('اللون', 'Colour')}</p>
              </div>

              {existingImages.map(img => (
                <div key={img.id} className="grid grid-cols-[80px_1fr_36px] gap-3 items-center p-3 bg-gray-50 rounded-xl border border-border">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-border shrink-0">
                    <img src={resolveImageUrl(img.image)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('اسم اللون', 'Colour name')}</label>
                    <input
                      type="text"
                      value={img.colour}
                      onChange={e => updateExistingColour(img.id, e.target.value)}
                      placeholder={t('مثال: أسود، ذهبي، فضي...', 'e.g. Black, Gold, Silver...')}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                    {img.colour && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-border shrink-0"
                          style={{ background: img.colour }}
                        />
                        <span className="text-xs text-muted-foreground">{img.colour}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {newImages.map((img, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_36px] gap-3 items-center p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white border border-yellow-200 shrink-0">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 start-0.5 text-[9px] bg-yellow-500 text-white px-1 py-0.5 rounded leading-none">
                      {t('جديد', 'New')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('اسم اللون', 'Colour name')}</label>
                    <input
                      type="text"
                      value={img.colour}
                      onChange={e => updateNewColour(i, e.target.value)}
                      placeholder={t('مثال: أسود، ذهبي، فضي...', 'e.g. Black, Gold, Silver...')}
                      className="w-full px-3 py-2 border border-yellow-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                    {img.colour && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-full border border-border shrink-0"
                          style={{ background: img.colour }}
                        />
                        <span className="text-xs text-muted-foreground">{img.colour}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => extraInputRef.current?.click()}
                className="w-full h-12 rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center gap-2 transition-colors text-muted-foreground hover:text-primary text-sm"
              >
                <Plus className="w-4 h-4" />
                {t('إضافة صورة لون آخر', 'Add another colour image')}
              </button>
            </div>
          )}
        </div>

        {/* ── Section 3: Product Details ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-base font-semibold text-secondary">{t('بيانات المنتج', 'Product Details')}</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              {t('اسم المنتج', 'Product Name')} <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('مثال: نظارة Ray-Ban', 'e.g. Ray-Ban Sunglasses')}
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t('الماركة', 'Brand')}</label>
            <select
              value={form.brand}
              onChange={e => setForm(f => ({ ...f, brand: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('بدون ماركة', 'No brand')}</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Category + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('التصنيف', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductForm['category'], frame_shape: '' }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(Object.keys(CATEGORY_LABELS) as DisplayCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c][language]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('الجنس', 'Gender')} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value as ProductForm['gender'] }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(['male', 'female', 'kids', 'unisex'] as const).map(g => (
                  <option key={g} value={g}>{GENDER_LABELS[g][language]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frame Shape — glasses only */}
          {isGlasses && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">{t('شكل الإطار', 'Frame Shape')}</label>
              <select
                value={form.frame_shape}
                onChange={e => setForm(f => ({ ...f, frame_shape: e.target.value as ProductForm['frame_shape'] }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('غير محدد', 'Not specified')}</option>
                {(['square', 'rectangle', 'round', 'cat_eye', 'oval'] as const).map(s => (
                  <option key={s} value={s}>{FRAME_SHAPE_LABELS[s][language]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Price + Previous Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('السعر (ج.م)', 'Price (EGP)')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('السعر قبل الخصم (ج.م)', 'Previous Price (EGP)')}
              </label>
              <input
                type="number" min="0" step="0.01"
                value={form.previous_price}
                onChange={e => setForm(f => ({ ...f, previous_price: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Stock + Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('الكمية في المخزون', 'Stock Quantity')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min="0"
                value={form.stock_quantity}
                onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                {t('حد المخزون المنخفض', 'Low Stock Threshold')}
              </label>
              <input
                type="number" min="0"
                value={form.low_stock_threshold}
                onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value === '' ? '' : Number(e.target.value) }))}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="5"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">{t('الوصف', 'Description')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder={t('وصف المنتج...', 'Product description...')}
            />
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-0 bg-white border-t border-border rounded-b-2xl px-6 py-4 flex justify-end gap-3 shadow-lg">
          <button
            onClick={() => router.push('/admin/products')}
            className="px-5 py-2 border border-border rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            {t('إلغاء', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ المنتج', 'Save Product')}
          </button>
        </div>

      </div>
    </AdminLayout>
  );
}
