'use client';

import { Dropdown } from '@/components/Dropdown';
import { type OrderStatus, ORDER_STATUS_ACTIONS, ORDER_STATUS_CONFIG, getOrderStatusConfig } from '@/lib/orderStatus';

interface Props {
  status: string;
  nextStatuses: OrderStatus[];
  busy?: boolean;
  onSelect: (status: OrderStatus) => void;
  t: (ar: string, en: string) => string;
}

// The current status shows as the pill; the menu lists only the statuses the
// order can move to, worded as actions.
export function OrderStatusDropdown({ status, nextStatuses, busy, onSelect, t }: Props) {
  const cfg = getOrderStatusConfig(status);
  const options = [
    { value: status, label: t(cfg.ar, cfg.en), icon: cfg.icon },
    ...nextStatuses.map(s => ({
      value: s as string,
      label: t(ORDER_STATUS_ACTIONS[s].ar, ORDER_STATUS_ACTIONS[s].en),
      icon: ORDER_STATUS_CONFIG[s].icon,
    })),
  ];

  return (
    <Dropdown
      value={status}
      options={options}
      onChange={s => onSelect(s as OrderStatus)}
      hideSelected
      busy={busy}
      menuMinWidth={190}
      className="inline-block"
      triggerClassName={`w-auto gap-1.5 ps-2.5 pe-2 py-1 text-xs font-medium rounded-full hover:brightness-95 [&_svg]:w-3.5 [&_svg]:h-3.5 ${cfg.color}`}
    />
  );
}
