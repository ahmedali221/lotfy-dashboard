'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/axios';
import {
  ShoppingCart, Package, AlertTriangle, Truck,
  CheckCircle, Clock, XCircle,
} from 'lucide-react';

interface StaffDashboard {
  placed_orders: number;
  approved_orders: number;
  ready_to_pick_up_orders: number;
  picked_up_orders: number;
  low_stock_products: number;
}

type OrderStatus = 'placed' | 'approved' | 'rejected' | 'ready_to_pick_up' | 'picked_up';

interface RecentOrder {
  id: number;
  customer: number;
  status: OrderStatus;
  total_price: string;
  deposit_amount: string;
  created: string;
  items: unknown[];
}

const ORDER_STATUS_CONFIG: Record<OrderStatus, { ar: string; en: string; color: string }> = {
  placed:           { ar: 'قيد الانتظار',   en: 'Placed',           color: 'bg-blue-100 text-blue-700 border-blue-200'   },
  approved:         { ar: 'معتمد',           en: 'Approved',         color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  rejected:         { ar: 'مرفوض',          en: 'Rejected',         color: 'bg-red-100 text-red-700 border-red-200'       },
  ready_to_pick_up: { ar: 'جاهز للاستلام', en: 'Ready to Pick Up', color: 'bg-green-100 text-green-700 border-green-200'  },
  picked_up:        { ar: 'تم الاستلام',   en: 'Picked Up',        color: 'bg-gray-100 text-gray-600 border-gray-200'    },
};

function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-7 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/orders/staff/dashboard/'),
      api.get('/api/catalog/products/', { params: { page: 1, page_size: 1 } }),
      api.get('/api/orders/', { params: { page: 1, page_size: 5 } }),
    ])
      .then(([dashRes, prodRes, ordersRes]) => {
        setDashboard(dashRes.data);
        setTotalProducts(prodRes.data.count);
        setRecentOrders(ordersRes.data.results);
      })
      .catch(() => setError(t('فشل تحميل البيانات، حاول تحديث الصفحة', 'Failed to load data, try refreshing the page')))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpiCards = [
    {
      label:  t('قيد الانتظار', 'Placed Orders'),
      value:  dashboard?.placed_orders,
      icon:   ShoppingCart,
      color:  'bg-blue-500',
    },
    {
      label:  t('جاهز للاستلام', 'Ready to Pick Up'),
      value:  dashboard?.ready_to_pick_up_orders,
      icon:   Truck,
      color:  'bg-green-500',
    },
    {
      label:  t('إجمالي المنتجات', 'Total Products'),
      value:  totalProducts ?? undefined,
      icon:   Package,
      color:  'bg-primary',
    },
    {
      label:  t('مخزون منخفض', 'Low Stock Products'),
      value:  dashboard?.low_stock_products,
      icon:   AlertTriangle,
      color:  'bg-red-500',
    },
  ];

  const statusBreakdown = [
    { label: t('قيد الانتظار', 'Placed'),           value: dashboard?.placed_orders,           icon: Clock,        color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: t('معتمد', 'Approved'),                 value: dashboard?.approved_orders,          icon: CheckCircle,  color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t('جاهز للاستلام', 'Ready to Pick Up'), value: dashboard?.ready_to_pick_up_orders,  icon: Truck,        color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: t('تم الاستلام', 'Picked Up'),          value: dashboard?.picked_up_orders,         icon: CheckCircle,  color: 'text-gray-600',   bg: 'bg-gray-50'   },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-1">{t('لوحة التحكم', 'Dashboard')}</h1>
          <p className="text-muted-foreground text-sm">{t('مرحباً بك في لوحة التحكم الإدارية', 'Welcome to your admin dashboard')}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : kpiCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-secondary">{card.value ?? '—'}</h3>
                        <p className="text-sm text-muted-foreground">{card.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-bold text-secondary mb-4">{t('حالة الطلبات', 'Orders Status Breakdown')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statusBreakdown.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`${item.bg} rounded-xl p-4 flex items-center gap-3`}>
                  <Icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                  <div>
                    <p className={`text-xl font-bold ${item.color}`}>
                      {loading ? <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" /> : (item.value ?? '—')}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-bold text-secondary">{t('أحدث الطلبات', 'Recent Orders')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  {[
                    { ar: 'رقم الطلب', en: 'Order ID' },
                    { ar: 'العميل',    en: 'Customer'  },
                    { ar: 'المنتجات', en: 'Items'     },
                    { ar: 'الإجمالي', en: 'Total'     },
                    { ar: 'الحالة',   en: 'Status'    },
                    { ar: 'التاريخ',  en: 'Date'      },
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground uppercase">
                      {t(h.ar, h.en)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : recentOrders.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                          {t('لا توجد طلبات حتى الآن', 'No orders yet')}
                        </td>
                      </tr>
                    )
                    : recentOrders.map(order => {
                        const statusCfg = ORDER_STATUS_CONFIG[order.status];
                        return (
                          <tr key={order.id} onClick={() => router.push(`/admin/orders/${order.id}`)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                            <td className="px-4 py-3 text-sm font-medium text-secondary">#{order.id}</td>
                            <td className="px-4 py-3 text-sm text-secondary">#{order.customer}</td>
                            <td className="px-4 py-3 text-sm text-secondary">
                              {(order.items as unknown[]).length} {t('منتج', 'items')}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-secondary">
                              {parseFloat(order.total_price).toLocaleString()} {t('ج.م', 'EGP')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusCfg?.color ?? ''}`}>
                                {statusCfg ? t(statusCfg.ar, statusCfg.en) : order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-secondary">
                              {new Date(order.created).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                            </td>
                          </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
