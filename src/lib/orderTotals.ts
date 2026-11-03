// The API's total_price covers items only; delivery_fee is stored separately.
// Orders placed before delivery_fee existed have it as 0, but checkout also wrote
// the fee into the notes as "الشحن: <fee> جنيه", so fall back to that line.
// Only the first matching line counts: checkout writes it before any customer notes.
export function deliveryFeeFromNotes(notes: string | null | undefined): number {
  const match = notes?.match(/^الشحن:\s*([\d.]+)\s*جنيه\s*$/m);
  const fee = match ? parseFloat(match[1]) : 0;
  return Number.isFinite(fee) ? fee : 0;
}

// A deposit counts against the total only once staff approve the order;
// before that it is just what the customer says they sent.
export const isDepositConfirmed = (status: string) => status !== 'placed' && status !== 'rejected';

export function orderTotals(order: {
  total_price: string;
  delivery_fee?: string | null;
  deposit_amount: string;
  notes?: string | null;
  status: string;
}) {
  const itemsTotal = parseFloat(order.total_price) || 0;
  const deliveryFee = parseFloat(order.delivery_fee ?? '') || deliveryFeeFromNotes(order.notes);
  const total = itemsTotal + deliveryFee;
  const deposit = parseFloat(order.deposit_amount) || 0;
  const confirmedDeposit = isDepositConfirmed(order.status) ? deposit : 0;
  return { itemsTotal, deliveryFee, total, deposit, confirmedDeposit, remaining: total - confirmedDeposit };
}
