'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import {
  Eye, Trash2, DollarSign, ShoppingCart, Truck,
  CheckCircle, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '@/lib/axios';

type OrderStatus = 'placed' | 'approved' | 'rejected' | 'ready_to_pick_up' | 'picked_up';

interface OrderItem {
  id: number;
  product: number | null;
  product_name_snapshot: string;
  product_category_snapshot: string;
  quantity: number;
  unit_price_snapshot: string;
  line_total: string;
}

interface OrderRead {
  id: number;
  customer: number;
  status: OrderStatus;
  total_price: string;
  deposit_amount: string;
  notes: string;
  items: OrderItem[];
  created: string;
  modified: string;
}

interface StaffDashboard {
  placed_orders: number;
  approved_orders: number;
  ready_to_pick_up_orders: number;
  picked_up_orders: number;
  low_stock_products: number;
}

const STATUS_CONFIG: Record<OrderStatus, { ar: string; en: string; color: string }> = {
  placed:           { ar: 'قيد الانتظار',   en: 'Placed',           color: 'bg-blue-100 text-blue-700 border-blue-200'     },
  approved:         { ar: 'معتمد',           en: 'Approved',         color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  rejected:         { ar: 'مرفوض',          en: 'Rejected',         color: 'bg-red-100 text-red-700 border-red-200'         },
  ready_to_pick_up: { ar: 'جاهز للاستلام', en: 'Ready to Pick Up', color: 'bg-green-100 text-green-700 border-green-200'   },
  picked_up:        { ar: 'تم الاستلام',   en: 'Picked Up',        color: 'bg-gray-100 text-gray-600 border-gray-200'      },
};

const PAGE_SIZE = 10;

const STATUS_OPTIONS: Array<{ id: OrderStatus | 'all'; ar: string; en: string }> = [
  { id: 'all',              ar: 'الكل',            en: 'All'             },
  { id: 'placed',           ar: 'قيد الانتظار',   en: 'Placed'          },
  { id: 'approved',         ar: 'معتمد',           en: 'Approved'        },
  { id: 'rejected',         ar: 'مرفوض',          en: 'Rejected'        },
  { id: 'ready_to_pick_up', ar: 'جاهز للاستلام', en: 'Ready to Pick Up'},
  { id: 'picked_up',        ar: 'تم الاستلام',   en: 'Picked Up'       },
];

export default function AdminOrdersPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  // List state
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stats
  const [dashStats, setDashStats] = useState<StaffDashboard | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Status transition
  const [transitioning, setTransitioning] = useState<number | null>(null);
  const [transitionError, setTransitionError] = useState<{ id: number; msg: string } | null>(null);

  // Delete modal
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Deposit modal
  const [depositModal, setDepositModal] = useState<{ id: number; current: string } | null>(null);
  const [depositValue, setDepositValue] = useState('');
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositError, setDepositError] = useState('');


  const fetchOrders = useCallback(async (currentPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: currentPage, page_size: PAGE_SIZE };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [ordersRes, dashRes] = await Promise.all([
        api.get('/api/orders/', { params }),
        api.get('/api/orders/staff/dashboard/'),
      ]);
      setOrders(ordersRes.data.results);
      setTotalCount(ordersRes.data.count);
      setDashStats(dashRes.data);
    } catch {
      setError(t('فشل تحميل الطلبات', 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  // Status transition
  const handleStatusTransition = async (orderId: number, newStatus: OrderStatus) => {
    setTransitioning(orderId);
    setTransitionError(null);
    try {
      await api.post(`/api/orders/${orderId}/transition-status/`, { status: newStatus });
      fetchOrders(page);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; status?: string[] } } };
      const msg = axiosErr.response?.data?.detail || axiosErr.response?.data?.status?.[0] || t('فشل تغيير الحالة', 'Failed to change status');
      setTransitionError({ id: orderId, msg });
    } finally {
      setTransitioning(null);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/orders/${deleteId}/`);
      setDeleteId(null);
      fetchOrders(page);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  // Deposit
  const openDepositModal = (order: OrderRead) => {
    setDepositModal({ id: order.id, current: order.deposit_amount });
    setDepositValue(order.deposit_amount);
    setDepositError('');
  };

  const handleDepositSave = async () => {
    if (!depositModal || !depositValue) return;
    setDepositSaving(true);
    setDepositError('');
    try {
      await api.post(`/api/orders/${depositModal.id}/update-deposit/`, { deposit_amount: depositValue });
      setDepositModal(null);
      fetchOrders(page);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string[]> } };
      const data = axiosErr.response?.data;
      const firstMsg = data ? Object.values(data).flat()[0] : null;
      setDepositError(firstMsg || t('فشل التحديث', 'Failed to update'));
    } finally {
      setDepositSaving(false);
    }
  };


  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statsCards = [
    { label: t('قيد الانتظار', 'Placed'),           value: dashStats?.placed_orders,           icon: Clock,         bg: 'bg-blue-500'   },
    { label: t('معتمد', 'Approved'),                 value: dashStats?.approved_orders,          icon: CheckCircle,   bg: 'bg-indigo-500' },
    { label: t('جاهز للاستلام', 'Ready to Pick Up'), value: dashStats?.ready_to_pick_up_orders,  icon: Truck,         bg: 'bg-green-500'  },
    { label: t('تم الاستلام', 'Picked Up'),          value: dashStats?.picked_up_orders,         icon: ShoppingCart,  bg: 'bg-gray-500'   },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-secondary mb-1">{t('إدارة الطلبات', 'Orders Management')}</h1>
            <p className="text-muted-foreground text-sm">{t('متابعة وإدارة جميع الطلبات', 'Track and manage all orders')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  {loading
                    ? <span className="w-5 h-5 bg-white/40 rounded animate-pulse" />
                    : <Icon className="w-5 h-5 text-white" />
                  }
                </div>
                <div>
                  <p className="text-xl font-bold text-secondary">
                    {loading ? <span className="inline-block w-8 h-5 bg-gray-200 rounded animate-pulse" /> : (s.value ?? '—')}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
            className="w-full md:w-56 px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{t(o.ar, o.en)}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  {[
                    { ar: 'رقم الطلب', en: 'Order'    },
                    { ar: 'العميل',    en: 'Customer'  },
                    { ar: 'المنتجات', en: 'Items'     },
                    { ar: 'الإجمالي', en: 'Total'     },
                    { ar: 'العربون',  en: 'Deposit'   },
                    { ar: 'الحالة',   en: 'Status'    },
                    { ar: 'التاريخ',  en: 'Date'      },
                    { ar: 'الإجراءات',en: 'Actions'   },
                  ].map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t(h.ar, h.en)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : orders.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                          {t('لا توجد طلبات', 'No orders found')}
                        </td>
                      </tr>
                    )
                    : orders.map(order => {
                        const statusCfg = STATUS_CONFIG[order.status];
                        const isTransitioning = transitioning === order.id;
                        return (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-4 text-sm font-medium text-secondary">#{order.id}</td>
                            <td className="px-5 py-4 text-sm text-secondary">#{order.customer}</td>
                            <td className="px-5 py-4 text-sm text-secondary">
                              {order.items.length} {t('منتج', 'items')}
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-secondary whitespace-nowrap">
                              {parseFloat(order.total_price).toLocaleString()} {t('ج.م', 'EGP')}
                            </td>
                            <td className="px-5 py-4 text-sm text-secondary whitespace-nowrap">
                              {parseFloat(order.deposit_amount).toLocaleString()} {t('ج.م', 'EGP')}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <select
                                  value={order.status}
                                  disabled={isTransitioning}
                                  onChange={e => handleStatusTransition(order.id, e.target.value as OrderStatus)}
                                  className={`px-2 py-1 text-xs font-medium rounded-full border cursor-pointer disabled:opacity-50 ${statusCfg.color}`}
                                >
                                  {STATUS_OPTIONS.filter(s => s.id !== 'all').map(s => (
                                    <option key={s.id} value={s.id}>{t(s.ar, s.en)}</option>
                                  ))}
                                </select>
                                {transitionError?.id === order.id && (
                                  <p className="text-xs text-red-600">{transitionError.msg}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-secondary whitespace-nowrap">
                              {new Date(order.created).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                  title={t('التفاصيل', 'Details')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDepositModal(order)}
                                  className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                  title={t('تعديل العربون', 'Update Deposit')}
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteId(order.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                  title={t('حذف', 'Delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(
                  `${totalCount} طلب — صفحة ${page} من ${totalPages}`,
                  `${totalCount} orders — Page ${page} of ${totalPages}`
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Deposit Modal ── */}
      {depositModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary">{t('تعديل العربون', 'Update Deposit')}</h3>
                <p className="text-xs text-muted-foreground">{t('طلب', 'Order')} #{depositModal.id}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  {t('مبلغ العربون (ج.م)', 'Deposit Amount (EGP)')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositValue}
                  onChange={e => setDepositValue(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              {depositError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {depositError}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDepositModal(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDepositSave}
                disabled={depositSaving}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              >
                {depositSaving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h3 className="text-lg font-bold text-secondary mb-2">{t('تأكيد الحذف', 'Confirm Delete')}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع.', 'Are you sure you want to delete this order? This cannot be undone.')}
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
                disabled={deleting}
                className="px-4 py-2 bg-destructive hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm"
              >
                {deleting ? t('جارٍ الحذف...', 'Deleting...') : t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
