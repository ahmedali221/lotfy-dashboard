'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/axios';
import {
  ArrowRight, ArrowLeft, Clock, CheckCircle, XCircle,
  Truck, ShoppingBag, DollarSign, FileText, Package,
  User, Calendar, Hash, AlertCircle, Loader2, Pencil, Trash2, ImageIcon,
} from 'lucide-react';

type OrderStatus = 'placed' | 'approved' | 'rejected' | 'ready_to_pick_up' | 'picked_up';

interface OrderItem {
  id: number;
  product: number | null;
  product_name_snapshot: string;
  product_category_snapshot: string;
  product_colour_snapshot: string;
  product_image_url: string | null;
  quantity: number;
  unit_price_snapshot: string;
  line_total: string;
}

interface OrderEvent {
  id: number;
  event_type: string;
  performed_by: number;
  meta: Record<string, unknown>;
  created: string;
}

interface OrderDetail {
  id: number;
  customer: number;
  status: OrderStatus;
  total_price: string;
  deposit_amount: string;
  notes: string;
  payment_proof: string | null;
  items: OrderItem[];
  created: string;
  modified: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://165.227.137.145:8080';
const resolveMedia = (url: string | null) =>
  url && !url.startsWith('http') ? `${BASE_URL}${url}` : url;

const STATUS_CONFIG: Record<OrderStatus, { ar: string; en: string; color: string; icon: React.ElementType }> = {
  placed:           { ar: 'قيد الانتظار',   en: 'Placed',           color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Clock       },
  approved:         { ar: 'معتمد',           en: 'Approved',         color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: CheckCircle },
  rejected:         { ar: 'مرفوض',          en: 'Rejected',         color: 'bg-red-100 text-red-700 border-red-200',         icon: XCircle     },
  ready_to_pick_up: { ar: 'جاهز للاستلام', en: 'Ready to Pick Up', color: 'bg-green-100 text-green-700 border-green-200',   icon: Truck       },
  picked_up:        { ar: 'تم الاستلام',   en: 'Picked Up',        color: 'bg-gray-100 text-gray-600 border-gray-200',      icon: ShoppingBag },
};

// Which statuses can this order transition to
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed:           ['approved', 'rejected'],
  approved:         ['ready_to_pick_up'],
  rejected:         [],
  ready_to_pick_up: ['picked_up'],
  picked_up:        [],
};

const STATUS_TRANSITION_LABELS: Record<OrderStatus, { ar: string; en: string; color: string }> = {
  approved:         { ar: 'اعتماد الطلب',      en: 'Approve Order',     color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  rejected:         { ar: 'رفض الطلب',          en: 'Reject Order',      color: 'bg-red-600 hover:bg-red-700 text-white'       },
  ready_to_pick_up: { ar: 'تعيين جاهز للاستلام', en: 'Mark Ready',       color: 'bg-green-600 hover:bg-green-700 text-white'   },
  picked_up:        { ar: 'تأكيد الاستلام',     en: 'Mark Picked Up',    color: 'bg-gray-600 hover:bg-gray-700 text-white'     },
  placed:           { ar: '',                    en: '',                   color: ''                                              },
};

export default function OrderDetailPage() {
  const { language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const isRtl = language === 'ar';
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status transition
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState('');

  // Deposit modal
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositValue, setDepositValue] = useState('');
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositError, setDepositError] = useState('');

  // Item edit modal
  const [editItem, setEditItem] = useState<OrderItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Item delete
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  const fetchOrder = useCallback(async () => {
    setError('');
    try {
      const [orderRes, eventsRes] = await Promise.all([
        api.get(`/api/orders/${orderId}/`),
        api.get(`/api/orders/${orderId}/events/`),
      ]);
      setOrder(orderRes.data);
      setEvents(eventsRes.data.results ?? eventsRes.data);
    } catch {
      setError(t('فشل تحميل الطلب', 'Failed to load order'));
    } finally {
      setLoading(false);
    }
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleTransition = async (newStatus: OrderStatus) => {
    setTransitioning(true);
    setTransitionError('');
    try {
      await api.post(`/api/orders/${orderId}/transition-status/`, { status: newStatus });
      await fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; status?: string[] } } };
      setTransitionError(e.response?.data?.detail || e.response?.data?.status?.[0] || t('فشل تغيير الحالة', 'Failed to change status'));
    } finally {
      setTransitioning(false);
    }
  };

  const openDeposit = () => {
    setDepositValue(order?.deposit_amount ?? '0');
    setDepositError('');
    setShowDeposit(true);
  };

  const handleDepositSave = async () => {
    if (!order) return;
    setDepositSaving(true);
    setDepositError('');
    try {
      await api.post(`/api/orders/${orderId}/update-deposit/`, { deposit_amount: depositValue });
      setShowDeposit(false);
      await fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      const data = e.response?.data;
      const msg = data ? Object.values(data).flat()[0] : null;
      setDepositError(msg || t('فشل التحديث', 'Update failed'));
    } finally {
      setDepositSaving(false);
    }
  };

  const openEditItem = (item: OrderItem) => {
    setEditItem(item);
    setEditQty(String(item.quantity));
    setEditError('');
  };

  const handleEditItem = async () => {
    if (!editItem) return;
    setEditSaving(true);
    setEditError('');
    try {
      await api.patch(`/api/orders/${orderId}/items/${editItem.id}/`, { quantity: parseInt(editQty) });
      setEditItem(null);
      await fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      const data = e.response?.data;
      const msg = data ? Object.values(data).flat()[0] : null;
      setEditError(msg || t('فشل التعديل', 'Edit failed'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    setDeletingItem(true);
    try {
      await api.delete(`/api/orders/${orderId}/items/${deleteItemId}/`);
      setDeleteItemId(null);
      await fetchOrder();
    } catch {
      setDeleteItemId(null);
    } finally {
      setDeletingItem(false);
    }
  };

  const canEditItems = order?.status === 'placed';
  const nextStatuses = order ? NEXT_STATUSES[order.status] : [];
  const total = order ? parseFloat(order.total_price) : 0;
  const deposit = order ? parseFloat(order.deposit_amount) : 0;
  const remaining = total - deposit;

  // ── Skeleton ──
  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-gray-100 rounded-xl" />
              <div className="h-64 bg-gray-100 rounded-xl" />
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-100 rounded-xl" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Error ──
  if (error || !order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-red-600 font-medium">{error || t('الطلب غير موجود', 'Order not found')}</p>
          <button onClick={() => router.back()} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
            <BackIcon className="w-4 h-4" />
            {t('رجوع', 'Go Back')}
          </button>
        </div>
      </AdminLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status];
  const StatusIcon = statusCfg.icon;

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-border"
          >
            <BackIcon className="w-5 h-5 text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-secondary">
              {t('تفاصيل الطلب', 'Order Details')} <span className="text-primary">#{order.id}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date(order.created).toLocaleString(isRtl ? 'ar-EG' : 'en-GB')}
            </p>
          </div>
          <div className="ms-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border ${statusCfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {t(statusCfg.ar, statusCfg.en)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Items + Events ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Items */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-secondary flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  {t('المنتجات', 'Items')} ({order.items.length})
                </h2>
              </div>
              {order.items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">{t('لا توجد منتجات', 'No items')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-border">
                      <tr>
                        {[
                          { ar: 'المنتج',      en: 'Product'    },
                          { ar: 'اللون',       en: 'Color'      },
                          { ar: 'التصنيف',    en: 'Category'   },
                          { ar: 'الكمية',     en: 'Qty'        },
                          { ar: 'سعر الوحدة', en: 'Unit Price' },
                          { ar: 'الإجمالي',   en: 'Total'      },
                          ...(canEditItems ? [{ ar: '', en: '' }] : []),
                        ].map((h, i) => (
                          <th key={i} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                            {t(h.ar, h.en)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.items.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-secondary">{item.product_name_snapshot}</td>
                          <td className="px-4 py-3">
                            {item.product_image_url || item.product_colour_snapshot ? (
                              <div className="flex items-center gap-2">
                                {item.product_image_url && (
                                  <img
                                    src={resolveMedia(item.product_image_url)!}
                                    alt={item.product_colour_snapshot || 'product'}
                                    className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0"
                                  />
                                )}
                                {item.product_colour_snapshot && (
                                  <span className="text-xs text-secondary">{item.product_colour_snapshot}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{item.product_category_snapshot}</td>
                          <td className="px-4 py-3 text-secondary">{item.quantity}</td>
                          <td className="px-4 py-3 text-secondary whitespace-nowrap">
                            {parseFloat(item.unit_price_snapshot).toLocaleString()} {t('ج.م', 'EGP')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-secondary whitespace-nowrap">
                            {parseFloat(item.line_total).toLocaleString()} {t('ج.م', 'EGP')}
                          </td>
                          {canEditItems && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditItem(item)}
                                  className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                  title={t('تعديل', 'Edit')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteItemId(item.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                  title={t('حذف', 'Delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h2 className="font-semibold text-secondary flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  {t('ملاحظات الطلب', 'Order Notes')}
                </h2>
                <p className="text-sm text-secondary whitespace-pre-line leading-relaxed">{order.notes}</p>
              </div>
            )}

            {/* Payment Proof */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="font-semibold text-secondary flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4 text-primary" />
                {t('إثبات الدفع', 'Proof of Payment')}
              </h2>
              {order.payment_proof ? (
                <a href={resolveMedia(order.payment_proof)!} target="_blank" rel="noopener noreferrer" className="block group">
                  <img
                    src={resolveMedia(order.payment_proof)!}
                    alt="Payment proof"
                    className="w-full max-w-sm rounded-xl border border-border object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <p className="text-xs text-primary mt-2 hover:underline">
                    {t('فتح في نافذة جديدة ↗', 'Open in new tab ↗')}
                  </p>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-border text-muted-foreground gap-2">
                  <ImageIcon className="w-8 h-8 opacity-30" />
                  <p className="text-sm">{t('لم يتم رفع إثبات الدفع بعد', 'No payment proof uploaded yet')}</p>
                </div>
              )}
            </div>

            {/* Event history */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-secondary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {t('سجل الأحداث', 'Event History')} ({events.length})
                </h2>
              </div>
              {events.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">{t('لا توجد أحداث', 'No events yet')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {events.map(ev => (
                    <div key={ev.id} className="px-6 py-4 flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary">{ev.event_type.replace(/_/g, ' ')}</p>
                        {Object.keys(ev.meta).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {JSON.stringify(ev.meta)}
                          </p>
                        )}
                      </div>
                      <div className="text-end flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.created).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.created).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Summary + Actions ── */}
          <div className="space-y-6">

            {/* Order info */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-secondary">{t('معلومات الطلب', 'Order Info')}</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span>{t('رقم الطلب:', 'Order ID:')}</span>
                  <span className="font-semibold text-secondary ms-auto">#{order.id}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span>{t('العميل:', 'Customer:')}</span>
                  <span className="font-semibold text-secondary ms-auto">#{order.customer}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{t('التاريخ:', 'Date:')}</span>
                  <span className="font-semibold text-secondary ms-auto">
                    {new Date(order.created).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{t('آخر تحديث:', 'Updated:')}</span>
                  <span className="font-semibold text-secondary ms-auto">
                    {new Date(order.modified).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB')}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-3">
              <h2 className="font-semibold text-secondary">{t('الملخص المالي', 'Financial Summary')}</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('إجمالي الطلب', 'Order Total')}</span>
                  <span className="font-bold text-secondary">{total.toLocaleString()} {t('ج.م', 'EGP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('العربون المدفوع', 'Deposit Paid')}</span>
                  <span className="font-medium text-green-600">{deposit.toLocaleString()} {t('ج.م', 'EGP')}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-1">
                  <span className="font-semibold text-secondary">{t('المتبقي', 'Remaining')}</span>
                  <span className="font-bold text-primary text-base">{remaining.toLocaleString()} {t('ج.م', 'EGP')}</span>
                </div>
              </div>

              {/* Update deposit */}
              {!['rejected', 'picked_up'].includes(order.status) && (
                <button
                  onClick={openDeposit}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-green-600" />
                  {t('تعديل العربون', 'Update Deposit')}
                </button>
              )}
            </div>

            {/* Status actions */}
            {nextStatuses.length > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-3">
                <h2 className="font-semibold text-secondary">{t('الإجراءات', 'Actions')}</h2>
                {transitionError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{transitionError}</p>
                )}
                <div className="space-y-2">
                  {nextStatuses.map(s => {
                    const cfg = STATUS_TRANSITION_LABELS[s];
                    return (
                      <button
                        key={s}
                        onClick={() => handleTransition(s)}
                        disabled={transitioning}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${cfg.color}`}
                      >
                        {transitioning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {t(cfg.ar, cfg.en)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Final state label */}
            {nextStatuses.length === 0 && (
              <div className={`rounded-xl border p-4 text-center text-sm font-medium ${statusCfg.color}`}>
                {order.status === 'picked_up'
                  ? t('✓ تم إغلاق الطلب بنجاح', '✓ Order completed')
                  : t('✗ تم رفض الطلب', '✗ Order rejected')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deposit Modal ── */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary">{t('تعديل العربون', 'Update Deposit')}</h3>
                <p className="text-xs text-muted-foreground">{t('طلب', 'Order')} #{order.id}</p>
              </div>
            </div>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              {t('مبلغ العربون (ج.م)', 'Deposit Amount (EGP)')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositValue}
              onChange={e => setDepositValue(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              dir="ltr"
            />
            {depositError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{depositError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowDeposit(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDepositSave}
                disabled={depositSaving}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              >
                {depositSaving ? t('جارٍ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Item Modal ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-secondary mb-1">{t('تعديل المنتج', 'Edit Item')}</h3>
            <p className="text-sm text-muted-foreground mb-5">{editItem.product_name_snapshot}</p>
            <label className="block text-sm font-medium text-secondary mb-1.5">
              {t('الكمية', 'Quantity')}
            </label>
            <input
              type="number"
              min="1"
              value={editQty}
              onChange={e => setEditQty(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              dir="ltr"
            />
            {editError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{editError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleEditItem}
                disabled={editSaving}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              >
                {editSaving ? t('جارٍ...', 'Saving...') : t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Item Confirm ── */}
      {deleteItemId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-secondary mb-2">{t('حذف المنتج', 'Remove Item')}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {t('هل تريد حذف هذا المنتج من الطلب؟', 'Remove this item from the order?')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteItemId(null)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={deletingItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm"
              >
                {deletingItem ? t('جارٍ...', 'Removing...') : t('حذف', 'Remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
