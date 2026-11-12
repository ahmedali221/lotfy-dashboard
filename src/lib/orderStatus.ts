import { Clock, CheckCircle, XCircle, Truck, ShoppingBag, Wallet, HelpCircle, Ban, Undo2 } from 'lucide-react';
import type { ElementType } from 'react';

export type OrderStatus = 'placed' | 'approved' | 'deposited' | 'rejected' | 'ready_to_pick_up' | 'picked_up' | 'cancelled' | 'returned';

export interface OrderStatusConfig {
  ar: string;
  en: string;
  color: string;
  icon: ElementType;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  placed:           { ar: 'قيد الانتظار',   en: 'Placed',           color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: Clock       },
  approved:         { ar: 'معتمد',           en: 'Approved',         color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: CheckCircle },
  deposited:        { ar: 'تم دفع العربون',  en: 'Deposited',        color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Wallet      },
  rejected:         { ar: 'مرفوض',          en: 'Rejected',         color: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle     },
  ready_to_pick_up: { ar: 'جاهز للاستلام', en: 'Ready to Pick Up', color: 'bg-green-100 text-green-700 border-green-200',    icon: Truck       },
  picked_up:        { ar: 'تم الاستلام',   en: 'Picked Up',        color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: ShoppingBag },
  cancelled:        { ar: 'ملغي',           en: 'Cancelled',        color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Ban         },
  returned:         { ar: 'مرتجع',          en: 'Returned',         color: 'bg-amber-100 text-amber-800 border-amber-200',    icon: Undo2       },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

// Statuses a staff member can move an order to. Approving an order with a
// verified deposit makes the backend return `deposited` instead of `approved`.
export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed:           ['approved', 'rejected'],
  approved:         ['ready_to_pick_up', 'cancelled'],
  deposited:        ['ready_to_pick_up', 'cancelled'],
  rejected:         [],
  ready_to_pick_up: ['picked_up', 'cancelled'],
  picked_up:        ['returned'],
  cancelled:        [],
  returned:         [],
};

// Cancelling or returning puts the items back in stock and cannot be undone,
// so staff confirm it and may give a reason, which is saved on the order event.
// Returns the reason (possibly empty) to send, or null when staff back out.
export const confirmTransition = (status: OrderStatus, t: (ar: string, en: string) => string): string | null => {
  if (status !== 'cancelled' && status !== 'returned') return '';
  const question = status === 'cancelled'
    ? t('تأكيد إلغاء الطلب؟ سيتم إرجاع المنتجات للمخزون.\nسبب الإلغاء (اختياري):', 'Cancel this order? Items go back to stock.\nReason (optional):')
    : t('تأكيد ارتجاع الطلب؟ سيتم إرجاع المنتجات للمخزون.\nسبب الارتجاع (اختياري):', 'Mark this order as returned? Items go back to stock.\nReason (optional):');
  const reason = window.prompt(question, '');
  return reason === null ? null : reason.trim();
};

// The API may add statuses before the dashboard knows about them, so never
// index the maps directly with a value that came from the server.
export const getOrderStatusConfig = (status: string): OrderStatusConfig =>
  ORDER_STATUS_CONFIG[status as OrderStatus] ?? {
    ar: status,
    en: status.replace(/_/g, ' '),
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: HelpCircle,
  };

export const getNextOrderStatuses = (status: string): OrderStatus[] =>
  NEXT_ORDER_STATUSES[status as OrderStatus] ?? [];

// Backend rules (orders/services.py): staff may edit the deposit only after the
// order leaves `placed`, and never on rejected, picked-up, cancelled or returned orders.
export const canUpdateDeposit = (status: string) =>
  ['approved', 'deposited', 'ready_to_pick_up'].includes(status);

// The payment proof (and the deposit sent with it) can only change while `placed`.
export const canChangePaymentProof = (status: string) => status === 'placed';

const ORDER_EVENT_LABELS: Record<string, { ar: string; en: string }> = {
  order_placed:           { ar: 'تم إنشاء الطلب',        en: 'Order placed'           },
  order_approved:         { ar: 'تم اعتماد الطلب',       en: 'Order approved'         },
  order_deposited:        { ar: 'تم تأكيد دفع العربون',  en: 'Deposit confirmed'      },
  order_rejected:         { ar: 'تم رفض الطلب',          en: 'Order rejected'         },
  deposit_updated:        { ar: 'تم تعديل العربون',       en: 'Deposit updated'        },
  payment_proof_uploaded: { ar: 'تم رفع إيصال الدفع',    en: 'Payment proof uploaded' },
  item_updated:           { ar: 'تم تعديل منتج',          en: 'Item updated'           },
  item_removed:           { ar: 'تم حذف منتج',            en: 'Item removed'           },
  price_updated:          { ar: 'تم تعديل السعر',         en: 'Price updated'          },
  ready_to_pick_up:       { ar: 'جاهز للاستلام',          en: 'Ready to pick up'       },
  picked_up:              { ar: 'تم الاستلام',            en: 'Picked up'              },
  order_cancelled:        { ar: 'تم إلغاء الطلب',         en: 'Order cancelled'        },
  order_returned:         { ar: 'تم ارتجاع الطلب',        en: 'Order returned'         },
  status_updated:         { ar: 'تم تغيير الحالة',        en: 'Status updated'         },
};

export const getOrderEventLabel = (eventType: string) =>
  ORDER_EVENT_LABELS[eventType] ?? { ar: eventType.replace(/_/g, ' '), en: eventType.replace(/_/g, ' ') };

type Translate = (ar: string, en: string) => string;
type MetaFormat = 'money' | 'status' | 'text' | 'proof' | 'hidden';

// Event meta keys written by orders/services.py. Changes come as `old_<field>` /
// `new_<field>` pairs; everything else is a plain value.
const EVENT_META_FIELDS: Record<string, { ar: string; en: string; format: MetaFormat; showUnchanged?: boolean }> = {
  status:         { ar: 'الحالة',           en: 'Status',        format: 'status' },
  deposit_amount: { ar: 'العربون',          en: 'Deposit',       format: 'money'  },
  payment_proof:  { ar: 'الإيصال',          en: 'Receipt',       format: 'proof'  },
  product_name:   { ar: 'المنتج',           en: 'Product',       format: 'text', showUnchanged: true },
  quantity:       { ar: 'الكمية',           en: 'Quantity',      format: 'text'   },
  unit_price:     { ar: 'سعر الوحدة',       en: 'Unit price',    format: 'money'  },
  line_total:     { ar: 'إجمالي المنتج',    en: 'Line total',    format: 'money'  },
  order_total:    { ar: 'إجمالي المنتجات',  en: 'Items total',   format: 'money'  },
  total_price:    { ar: 'إجمالي المنتجات',  en: 'Items total',   format: 'money'  },
  delivery_fee:   { ar: 'رسوم التوصيل',     en: 'Delivery fee',  format: 'money'  },
  item_count:     { ar: 'عدد المنتجات',     en: 'Items',         format: 'text'   },
  item_id:        { ar: '',                 en: '',              format: 'hidden' },
  product_id:     { ar: '',                 en: '',              format: 'hidden' },
};

export interface OrderEventDetail {
  label: string;
  value?: string;
  from?: string;
  to?: string;
}

const formatMetaValue = (value: unknown, format: MetaFormat, t: Translate): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (format === 'money') return `${(parseFloat(String(value)) || 0).toLocaleString()} ${t('ج.م', 'EGP')}`;
  if (format === 'status') {
    const config = getOrderStatusConfig(String(value));
    return t(config.ar, config.en);
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

// Turns an event's raw meta into labelled lines staff can read.
export const getOrderEventDetails = (meta: Record<string, unknown>, t: Translate): OrderEventDetail[] => {
  const fields = [...new Set(Object.keys(meta).map(key => key.replace(/^(old|new)_/, '')))];
  const details: OrderEventDetail[] = [];

  for (const field of fields) {
    const config = EVENT_META_FIELDS[field];
    const format = config?.format ?? 'text';
    if (format === 'hidden') continue;
    const label = config ? t(config.ar, config.en) : field.replace(/_/g, ' ');
    const oldKey = `old_${field}`;
    const newKey = `new_${field}`;

    // The file path means nothing to staff; the current receipt is shown on the page.
    if (format === 'proof') {
      if (meta[oldKey] && meta[oldKey] !== meta[newKey]) {
        details.push({ label, value: t('تم استبدال إيصال سابق', 'Replaced a previous receipt') });
      }
      continue;
    }

    if (!(oldKey in meta) && !(newKey in meta)) {
      details.push({ label, value: formatMetaValue(meta[field], format, t) });
      continue;
    }

    const to = formatMetaValue(meta[newKey], format, t);
    if (!(oldKey in meta)) {
      details.push({ label, value: to });
      continue;
    }
    const from = formatMetaValue(meta[oldKey], format, t);
    if (from === to) {
      if (config?.showUnchanged) details.push({ label, value: to });
      continue;
    }
    details.push({ label, from, to });
  }

  return details;
};
