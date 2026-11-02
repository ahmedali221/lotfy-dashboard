import { Clock, CheckCircle, XCircle, Truck, ShoppingBag, Wallet, HelpCircle } from 'lucide-react';
import type { ElementType } from 'react';

export type OrderStatus = 'placed' | 'approved' | 'deposited' | 'rejected' | 'ready_to_pick_up' | 'picked_up';

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
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

// Statuses a staff member can move an order to. Approving an order with a
// verified deposit makes the backend return `deposited` instead of `approved`.
export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed:           ['approved', 'rejected'],
  approved:         ['ready_to_pick_up'],
  deposited:        ['ready_to_pick_up'],
  rejected:         [],
  ready_to_pick_up: ['picked_up'],
  picked_up:        [],
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
// order leaves `placed`, and never on rejected or picked-up orders.
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
  status_updated:         { ar: 'تم تغيير الحالة',        en: 'Status updated'         },
};

export const getOrderEventLabel = (eventType: string) =>
  ORDER_EVENT_LABELS[eventType] ?? { ar: eventType.replace(/_/g, ' '), en: eventType.replace(/_/g, ' ') };
