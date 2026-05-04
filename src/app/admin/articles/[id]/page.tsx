'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, Clock, User, FileText, Pencil, Trash2, XCircle, Upload, PlusCircle, GripVertical } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';

interface ApiArticleSection {
  id?: number;
  title: string;
  description: string;
  sort_order: number;
}

interface ApiArticle {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  author: string;
  minutes_to_read: number;
  published_date: string;
  sections: ApiArticleSection[];
  created: string;
  modified: string;
}

interface ArticleForm {
  title: string;
  subtitle: string;
  author: string;
  minutes_to_read: number | '';
  published_date: string;
  sections: ApiArticleSection[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';

function resolveImageUrl(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function ArticleDetailPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string;

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const isRTL = language === 'ar';

  const [article, setArticle] = useState<ApiArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ArticleForm>({ title: '', subtitle: '', author: '', minutes_to_read: '', published_date: '', sections: [] });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchArticle = () => {
    setLoading(true);
    setError('');
    api.get(`/api/articles/${articleId}/`)
      .then(({ data }) => setArticle(data))
      .catch(() => setError(t('فشل تحميل المقال', 'Failed to load article')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (articleId) fetchArticle();
  }, [articleId]);

  const openEdit = () => {
    if (!article) return;
    setForm({
      title: article.title,
      subtitle: article.subtitle,
      author: article.author,
      minutes_to_read: article.minutes_to_read,
      published_date: article.published_date,
      sections: article.sections.map(s => ({ ...s })),
    });
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl(resolveImageUrl(article.image));
    setFormError('');
    setEditOpen(true);
  };

  const addSection = () => {
    setForm(f => ({ ...f, sections: [...f.sections, { title: '', description: '', sort_order: f.sections.length }] }));
  };

  const updateSection = (index: number, field: keyof ApiArticleSection, value: string | number) => {
    setForm(f => {
      const sections = [...f.sections];
      sections[index] = { ...sections[index], [field]: value };
      return { ...f, sections };
    });
  };

  const removeSection = (index: number) => {
    setForm(f => ({
      ...f,
      sections: f.sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, sort_order: i })),
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.author.trim() || !form.published_date || form.minutes_to_read === '') {
      setFormError(t('يرجى ملء جميع الحقول المطلوبة', 'Please fill all required fields'));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const sectionsData = form.sections.map((s, i) => ({
        ...(s.id ? { id: s.id } : {}),
        title: s.title,
        description: s.description,
        sort_order: i,
      }));

      // Step 1: send article data + sections as JSON (drf-writable-nested requires JSON)
      await api.patch(`/api/articles/${articleId}/`, {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        author: form.author.trim(),
        minutes_to_read: Number(form.minutes_to_read),
        published_date: form.published_date,
        sections: sectionsData,
      });

      // Step 2: if there's a new image, PATCH it separately as multipart
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await api.patch(`/api/articles/${articleId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setEditOpen(false);
      fetchArticle();
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
    try {
      await api.delete(`/api/articles/${articleId}/`);
      router.push('/admin/articles');
    } catch {
      setDeleteOpen(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return dateStr; }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back link */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t('العودة للمقالات', 'Back to Articles')}
          </Link>
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl border border-border p-16 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('جارٍ التحميل...', 'Loading...')}</p>
            </div>
          </div>
        ) : error || !article ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <FileText className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error || t('المقال غير موجود', 'Article not found')}</p>
            <Link href="/admin/articles" className="mt-4 inline-block text-sm text-primary hover:underline">
              {t('العودة للمقالات', 'Back to Articles')}
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-secondary mb-1 leading-tight">{article.title}</h1>
                {article.subtitle && (
                  <p className="text-muted-foreground">{article.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={openEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  {t('تعديل', 'Edit')}
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('حذف', 'Delete')}
                </button>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {article.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(article.published_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {article.minutes_to_read} {t('دقائق قراءة', 'min read')}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {article.sections.length} {t('أقسام', 'sections')}
              </span>
            </div>

            {/* Hero Image */}
            {article.image && (
              <div className="rounded-2xl overflow-hidden border border-border">
                <img
                  src={resolveImageUrl(article.image)}
                  alt={article.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Sections */}
            {article.sections.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-secondary">{t('محتوى المقال', 'Article Content')}</h2>
                {article.sections.map((section, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      {section.title && (
                        <h3 className="font-semibold text-secondary">{section.title}</h3>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-secondary/80 leading-relaxed whitespace-pre-line text-sm">
                        {section.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-dashed border-border p-10 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">{t('لا يوجد محتوى في هذا المقال', 'No content in this article')}</p>
                <button onClick={openEdit} className="mt-3 text-sm text-primary hover:underline">
                  {t('إضافة أقسام', 'Add sections')}
                </button>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-xl border border-border p-4 text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>{t('تاريخ الإنشاء:', 'Created:')} {formatDate(article.created)}</span>
              <span>{t('آخر تعديل:', 'Last modified:')} {formatDate(article.modified)}</span>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-secondary">{t('تعديل المقال', 'Edit Article')}</h2>
              <button onClick={() => setEditOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('العنوان', 'Title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('العنوان الفرعي / الملخص', 'Subtitle / Summary')}
                </label>
                <textarea
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('الكاتب', 'Author')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.author}
                    onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('تاريخ النشر', 'Publish Date')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.published_date}
                    onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {t('وقت القراءة (دقيقة)', 'Read Time (min)')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.minutes_to_read}
                    onChange={e => setForm(f => ({ ...f, minutes_to_read: e.target.value === '' ? '' : Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">{t('صورة المقال', 'Article Image')}</label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('edit-img-input')?.click()}
                >
                  {imagePreview || existingImageUrl ? (
                    <div className="relative inline-block">
                      <img src={imagePreview || existingImageUrl} alt="preview" className="h-32 object-cover rounded-lg mx-auto" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(''); setExistingImageUrl(''); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{t('اضغط لرفع صورة', 'Click to upload image')}</p>
                    </div>
                  )}
                  <input
                    id="edit-img-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }}
                  />
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-secondary">{t('أقسام المقال', 'Article Sections')}</label>
                  <button type="button" onClick={addSection} className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors">
                    <PlusCircle className="w-4 h-4" />
                    {t('إضافة قسم', 'Add Section')}
                  </button>
                </div>
                <div className="space-y-3">
                  {form.sections.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                      {t('لا يوجد أقسام بعد.', 'No sections yet.')}
                    </p>
                  )}
                  {form.sections.map((section, index) => (
                    <div key={index} className="border border-border rounded-xl p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">{t(`القسم ${index + 1}`, `Section ${index + 1}`)}</span>
                        </div>
                        <button type="button" onClick={() => removeSection(index)} className="text-red-400 hover:text-red-600 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={section.title}
                        onChange={e => updateSection(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        placeholder={t('عنوان القسم', 'Section title')}
                      />
                      <textarea
                        value={section.description}
                        onChange={e => updateSection(index, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-white"
                        placeholder={t('محتوى القسم...', 'Section content...')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setEditOpen(false)} className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ التعديلات', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-secondary mb-1">{t('حذف المقال', 'Delete Article')}</h3>
              <p className="text-sm text-muted-foreground">{t('هل أنت متأكد من حذف هذا المقال؟ لا يمكن التراجع.', 'Are you sure you want to delete this article? This cannot be undone.')}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors">{t('إلغاء', 'Cancel')}</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">{t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
