'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Plus, Pencil, Trash2, FileText, ChevronLeft, ChevronRight, Upload, XCircle, PlusCircle, GripVertical, Eye } from 'lucide-react';
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

const PAGE_SIZE = 10;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';

function resolveImageUrl(url: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

const EMPTY_FORM: ArticleForm = {
  title: '',
  subtitle: '',
  author: '',
  minutes_to_read: '',
  published_date: new Date().toISOString().split('T')[0],
  sections: [],
};

export default function AdminArticlesPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [articles, setArticles] = useState<ApiArticle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchArticles = useCallback(async (currentPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: currentPage, page_size: PAGE_SIZE };
      if (searchTerm) params.search = searchTerm;
      const { data } = await api.get('/api/articles/', { params });
      setArticles(data.results ?? data);
      setTotalCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError(t('فشل تحميل المقالات', 'Failed to load articles'));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, language]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { setPage(1); }, [searchTerm]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl('');
    setModalOpen(true);
  };

  const openEdit = (a: ApiArticle) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      subtitle: a.subtitle,
      author: a.author,
      minutes_to_read: a.minutes_to_read,
      published_date: a.published_date,
      sections: a.sections.map(s => ({ ...s })),
    });
    setFormError('');
    setImageFile(null);
    setImagePreview('');
    setExistingImageUrl(resolveImageUrl(a.image));
    setModalOpen(true);
  };

  const handleImageChange = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addSection = () => {
    setForm(f => ({
      ...f,
      sections: [...f.sections, { title: '', description: '', sort_order: f.sections.length }],
    }));
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
      const jsonPayload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        author: form.author.trim(),
        minutes_to_read: Number(form.minutes_to_read),
        published_date: form.published_date,
        sections: sectionsData,
      };

      let articleId: number;
      if (editingId) {
        const { data } = await api.patch(`/api/articles/${editingId}/`, jsonPayload);
        articleId = data.id;
      } else {
        const { data } = await api.post('/api/articles/', jsonPayload);
        articleId = data.id;
      }

      // Step 2: if there's a new image, PATCH it separately as multipart
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await api.patch(`/api/articles/${articleId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setModalOpen(false);
      fetchArticles();
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
      await api.delete(`/api/articles/${deleteId}/`);
    } finally {
      setDeleteId(null);
      fetchArticles();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('إدارة المقالات', 'Articles Management')}</h1>
            <p className="text-muted-foreground text-sm">{t('إدارة جميع المقالات والمحتوى', 'Manage all articles and content')}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t('مقال جديد', 'New Article')}
          </button>
        </div>

        {/* Search */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={t('البحث في المقالات...', 'Search articles...')}
              className="w-full ps-10 pe-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('المقال', 'Article')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('الكاتب', 'Author')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('تاريخ النشر', 'Published')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('وقت القراءة', 'Read Time')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('الأقسام', 'Sections')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">{t('لا توجد مقالات', 'No articles found')}</p>
                    </td>
                  </tr>
                ) : (
                  articles.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {a.image ? (
                            <img src={resolveImageUrl(a.image)} alt={a.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link href={`/admin/articles/${a.id}`} className="text-sm font-medium text-secondary hover:text-primary transition-colors truncate max-w-[240px] block">
                              {a.title}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{a.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{a.author}</td>
                      <td className="px-5 py-4 text-sm text-secondary">{formatDate(a.published_date)}</td>
                      <td className="px-5 py-4 text-sm text-secondary">{a.minutes_to_read} {t('د', 'min')}</td>
                      <td className="px-5 py-4 text-sm text-secondary">{a.sections.length}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/articles/${a.id}`}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('عرض التفاصيل', 'View Details')}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEdit(a)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('تعديل', 'Edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(a.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('حذف', 'Delete')}
                          >
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(`${totalCount} مقال`, `${totalCount} articles`)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-4 px-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-secondary">
                {editingId ? t('تعديل المقال', 'Edit Article') : t('إضافة مقال جديد', 'Add New Article')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('العنوان', 'Title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('عنوان المقال', 'Article title')}
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  {t('العنوان الفرعي / الملخص', 'Subtitle / Summary')}
                </label>
                <textarea
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={t('ملخص قصير للمقال', 'Short article summary')}
                />
              </div>

              {/* Author + Date + Reading time */}
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
                    placeholder={t('اسم الكاتب', 'Author name')}
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
                    placeholder="5"
                  />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">{t('صورة المقال', 'Article Image')}</label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {imagePreview || existingImageUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || existingImageUrl}
                        alt="preview"
                        className="h-32 object-cover rounded-lg mx-auto"
                      />
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
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleImageChange(e.target.files)}
                  />
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-secondary">{t('أقسام المقال', 'Article Sections')}</label>
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t('إضافة قسم', 'Add Section')}
                  </button>
                </div>
                <div className="space-y-3">
                  {form.sections.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                      {t('لا يوجد أقسام بعد. اضغط "إضافة قسم" لإضافة محتوى.', 'No sections yet. Click "Add Section" to add content.')}
                    </p>
                  )}
                  {form.sections.map((section, index) => (
                    <div key={index} className="border border-border rounded-xl p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">{t(`القسم ${index + 1}`, `Section ${index + 1}`)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
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
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving ? t('جارٍ الحفظ...', 'Saving...') : editingId ? t('حفظ التعديلات', 'Save Changes') : t('نشر المقال', 'Publish Article')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
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
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors">{t('إلغاء', 'Cancel')}</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">{t('حذف', 'Delete')}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
