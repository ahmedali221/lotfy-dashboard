'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { Plus, Pencil, Trash2, Users, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import api from '@/lib/axios';

const PAGE_SIZE = 5;

interface StaffMember {
  id: number;
  name: string;
  email: string;
  is_superuser: boolean;
}

export default function AdminStaffPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [isSuperuser, setIsSuperuser] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('adminUser');
      setIsSuperuser(JSON.parse(raw ?? '{}')?.is_superuser === true);
    } catch { setIsSuperuser(false); }
  }, []);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/auth/staff/', { params: { page_size: 100 } });
      setStaff(data.results ?? data);
      setPage(1);
    } catch {
      setError(t('فشل تحميل الموظفين', 'Failed to load staff'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/auth/staff/${deleteId}/`);
    } finally {
      setDeleteId(null);
      fetchStaff();
    }
  };

  const totalPages = Math.max(1, Math.ceil(staff.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = staff.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('إدارة الموظفين', 'Staff Management')}</h1>
            <p className="text-muted-foreground text-sm">{t('إدارة حسابات الموظفين', 'Manage staff accounts')}</p>
          </div>
          {isSuperuser && (
            <Link
              href="/admin/staff/add"
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              {t('موظف جديد', 'New Staff')}
            </Link>
          )}
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
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الاسم', 'Name')}</th>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('البريد الإلكتروني', 'Email')}</th>
                <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الإجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {t('لا يوجد موظفون بعد', 'No staff members yet')}
                  </td>
                </tr>
              ) : (
                <>
                  {slice.map((member, idx) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-muted-foreground">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-5 py-4 text-sm font-medium text-secondary">{member.name}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{member.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/staff/${member.id}`}
                            className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                            title={t('عرض', 'View')}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {isSuperuser && (
                            <Link
                              href={`/admin/staff/${member.id}`}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              title={t('تعديل', 'Edit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => setDeleteId(member.id)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title={t('حذف', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {totalPages > 1 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {t(
                              `${staff.length} موظف — صفحة ${safePage} من ${totalPages}`,
                              `${staff.length} staff — Page ${safePage} of ${totalPages}`
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

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-secondary mb-2">{t('تأكيد الحذف', 'Confirm Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('سيتم حذف حساب الموظف نهائياً.', 'The staff account will be permanently deleted.')}
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
