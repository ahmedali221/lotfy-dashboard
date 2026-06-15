'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import { ClipboardList, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/axios';

const PAGE_SIZE = 20;

interface PackageSummary {
  id: number;
  name: string;
  points: number;
  auction_cost: number;
  product_cost: number;
  activation_period_days: number;
}

interface SellerPackageRequest {
  id: number;
  owner_id: number;
  owner_nickname: string;
  package: PackageSummary;
  remaining_points: number;
  activated: boolean;
  activated_at: string | null;
  expires_at: string | null;
  status: 'pending' | 'active' | 'exhausted' | 'cancelled';
  created: string;
}

type ActionType = 'active' | 'cancelled';

export default function AdminSellerPackagesPage() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const [items, setItems] = useState<SellerPackageRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmType, setConfirmType] = useState<ActionType | null>(null);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchItems = useCallback(async (pg: number) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { page: pg, page_size: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await api.get('/api/seller-packages/', { params });
      setItems(data.results ?? data);
      setTotalCount(data.count ?? (data.results ?? data).length);
    } catch {
      setError(t('فشل تحميل طلبات الباقات', 'Failed to load package requests'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, language]);

  useEffect(() => {
    setPage(1);
    fetchItems(1);
  }, [fetchItems]);

  const handlePageChange = (next: number) => {
    setPage(next);
    fetchItems(next);
  };

  const openConfirm = (id: number, type: ActionType) => {
    setConfirmId(id);
    setConfirmType(type);
    setActionError('');
  };

  const handleAction = async () => {
    if (!confirmId || !confirmType) return;
    setActioning(true);
    setActionError('');
    try {
      await api.patch(`/api/seller-packages/${confirmId}/`, { status: confirmType });
      setConfirmId(null);
      setConfirmType(null);
      fetchItems(page);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown> } };
      const data = axiosErr.response?.data;
      const firstMsg = data ? (Object.values(data).flat()[0] as string) : null;
      setActionError(firstMsg || t('فشلت العملية، حاول مرة أخرى', 'Operation failed, please try again'));
    } finally {
      setActioning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const STATUS_LABELS: Record<string, [string, string]> = {
    pending:   ['قيد الانتظار', 'Pending'],
    active:    ['نشطة',         'Active'],
    exhausted: ['منتهية النقاط', 'Exhausted'],
    cancelled: ['ملغاة',        'Cancelled'],
  };

  const STATUS_CLASSES: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-700',
    active:    'bg-green-100 text-green-700',
    exhausted: 'bg-gray-100 text-gray-500',
    cancelled: 'bg-red-100 text-red-600',
  };

  const statusLabel = (s: string) => {
    const pair = STATUS_LABELS[s];
    return pair ? t(pair[0], pair[1]) : s;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">
              {t('طلبات الباقات', 'Package Requests')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('مراجعة وتفعيل طلبات اشتراك البائعين', 'Review and activate seller subscription requests')}
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="all">{t('جميع الحالات', 'All Statuses')}</option>
            <option value="pending">{t('قيد الانتظار', 'Pending')}</option>
            <option value="active">{t('نشطة', 'Active')}</option>
            <option value="exhausted">{t('منتهية', 'Exhausted')}</option>
            <option value="cancelled">{t('ملغاة', 'Cancelled')}</option>
          </select>
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
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('البائع', 'Seller')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الباقة', 'Package')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('النقاط المتبقية', 'Rem. Points')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الحالة', 'Status')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('تاريخ الانتهاء', 'Expires')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('تاريخ الطلب', 'Requested')}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">{t('الإجراءات', 'Actions')}</th>
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
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {t('لا توجد طلبات', 'No requests found')}
                    </td>
                  </tr>
                ) : (
                  <>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-secondary">
                            {item.owner_nickname || `#${item.owner_id}`}
                          </div>
                          <div className="text-xs text-muted-foreground">ID: {item.owner_id}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-secondary">{item.package.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.package.points} {t('نقطة', 'pts')}
                            {' · '}{t('مزاد', 'auction')}: {item.package.auction_cost}
                            {' · '}{t('منتج', 'product')}: {item.package.product_cost}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-secondary">
                          {item.remaining_points}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_CLASSES[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {formatDate(item.expires_at)}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {formatDate(item.created)}
                        </td>
                        <td className="px-5 py-4">
                          {item.status === 'pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openConfirm(item.id, 'active')}
                                className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                title={t('تفعيل', 'Activate')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openConfirm(item.id, 'cancelled')}
                                className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                title={t('رفض', 'Reject')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {totalPages > 1 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {t(
                                `${totalCount} طلب — صفحة ${page} من ${totalPages}`,
                                `${totalCount} requests — Page ${page} of ${totalPages}`,
                              )}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePageChange(Math.max(1, page - 1))}
                                disabled={page === 1}
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

      {/* Confirm Action Modal */}
      {confirmId && confirmType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            {confirmType === 'active' ? (
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            )}
            <h3 className="text-lg font-bold text-secondary mb-2">
              {confirmType === 'active'
                ? t('تفعيل الباقة', 'Activate Package')
                : t('رفض الطلب', 'Reject Request')}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {confirmType === 'active'
                ? t(
                    'سيتم تفعيل هذه الباقة للبائع. أي باقة نشطة سابقة سيتم إلغاؤها تلقائياً.',
                    'This package will be activated for the seller. Any previously active package will be deactivated automatically.',
                  )
                : t(
                    'سيتم رفض هذا الطلب. يمكن للبائع تقديم طلب جديد لاحقاً.',
                    'This request will be cancelled. The seller can submit a new request later.',
                  )}
            </p>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {actionError}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setConfirmId(null); setConfirmType(null); setActionError(''); }}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={actioning}
                className={`px-5 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors ${
                  confirmType === 'active'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {actioning
                  ? t('جارٍ التنفيذ...', 'Processing...')
                  : confirmType === 'active'
                  ? t('تأكيد التفعيل', 'Confirm Activate')
                  : t('تأكيد الرفض', 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
