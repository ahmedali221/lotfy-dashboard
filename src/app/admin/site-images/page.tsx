'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { ImagePlus, Trash2, Replace, ImageIcon } from 'lucide-react';
import api from '@/lib/axios';
import { getApiError } from '@/lib/apiError';
import { fetchAllPages } from '@/lib/pagination';

interface SiteImage {
  id: number;
  category: string;
  image: string;
  created: string;
  modified: string;
}

// The website shows the newest image of each category. Only "header" exists today.
const CATEGORY = 'header';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function SiteImagesPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const uploadInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceId = useRef<number | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      // Newest first, so images[0] is the one the website shows.
      setImages(await fetchAllPages<SiteImage>('/api/site/images/', { category: CATEGORY }));
    } catch (err) {
      setError(getApiError(err, language, { ar: 'فشل تحميل الصور', en: 'Failed to load images' }));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const run = async (request: () => Promise<unknown>, fallback: { ar: string; en: string }) => {
    setBusy(true);
    setError('');
    try {
      await request();
      await fetchImages();
    } catch (err) {
      setError(getApiError(err, language, fallback));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = (file: File) => {
    const body = new FormData();
    body.append('category', CATEGORY);
    body.append('image', file);
    run(() => api.post('/api/site/images/', body), { ar: 'فشل رفع الصورة', en: 'Failed to upload image' });
  };

  const handleReplace = (id: number, file: File) => {
    const body = new FormData();
    body.append('image', file);
    run(() => api.patch(`/api/site/images/${id}/`, body), { ar: 'فشل استبدال الصورة', en: 'Failed to replace image' });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    run(() => api.delete(`/api/site/images/${id}/`), { ar: 'فشل حذف الصورة', en: 'Failed to delete image' });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const [current, ...history] = images;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('صورة الواجهة', 'Header Image')}</h1>
            <p className="text-muted-foreground text-sm">
              {t('الموقع يعرض أحدث صورة مرفوعة في أعلى الصفحة الرئيسية.', 'The website shows the newest uploaded image at the top of the home page.')}
            </p>
          </div>
          <button
            onClick={() => uploadInput.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md disabled:opacity-60"
          >
            <ImagePlus className="w-4 h-4" />
            {t('رفع صورة جديدة', 'Upload New Image')}
          </button>
        </div>

        <input
          ref={uploadInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
        <input
          ref={replaceInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f && replaceId.current !== null) handleReplace(replaceId.current, f);
            e.target.value = '';
          }}
        />

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="bg-card rounded-2xl border border-border h-72 animate-pulse" />
        ) : !current ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {t('لا توجد صورة بعد. الموقع يعرض الصورة الافتراضية.', 'No image yet. The website shows the default image.')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <ImageCard
              image={current}
              badge={t('المعروضة الآن', 'Live now')}
              dateLabel={formatDate(current.created)}
              busy={busy}
              t={t}
              onReplace={() => { replaceId.current = current.id; replaceInput.current?.click(); }}
              onDelete={() => setDeleteId(current.id)}
              large
            />

            {history.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-secondary mb-3">{t('صور سابقة', 'Previous Images')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map(img => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      dateLabel={formatDate(img.created)}
                      busy={busy}
                      t={t}
                      onReplace={() => { replaceId.current = img.id; replaceInput.current?.click(); }}
                      onDelete={() => setDeleteId(img.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <Trash2 className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h3 className="text-lg font-bold text-secondary mb-2">{t('تأكيد الحذف', 'Confirm Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('سيتم حذف الصورة نهائياً.', 'The image will be deleted permanently.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50">
                {t('إلغاء', 'Cancel')}
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-white rounded-lg text-sm bg-red-500 hover:bg-red-600">
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function ImageCard({
  image, badge, dateLabel, busy, t, onReplace, onDelete, large,
}: {
  image: SiteImage;
  badge?: string;
  dateLabel: string;
  busy: boolean;
  t: (ar: string, en: string) => string;
  onReplace: () => void;
  onDelete: () => void;
  large?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className={`relative bg-gray-100 ${large ? 'h-72' : 'h-40'}`}>
        <img src={resolveImageUrl(image.image)} alt="" className="w-full h-full object-cover" />
        {badge && (
          <span className="absolute top-3 start-3 px-2.5 py-1 text-xs font-medium rounded-full bg-green-500 text-white">{badge}</span>
        )}
      </div>
      <div className="p-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReplace}
            disabled={busy}
            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors disabled:opacity-60"
            title={t('استبدال', 'Replace')}
          >
            <Replace className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-60"
            title={t('حذف', 'Delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
