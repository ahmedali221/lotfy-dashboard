// Discounts are stored on the product as two prices: `previous_price` is the
// original price and `price` is what the customer pays. The percentage is never
// stored; it is derived from the two prices wherever it is shown.

export function applyDiscount(basePrice: number, pct: number): string {
  return (Math.round(basePrice * (100 - pct)) / 100).toFixed(2);
}

export function isValidDiscountPct(pct: number): boolean {
  return Number.isFinite(pct) && pct >= 0 && pct < 100;
}

// The price before any discount: the previous price when it is higher, else the price.
export function basePriceOf(p: { price: string; previous_price: string | null }): number {
  const price = parseFloat(p.price);
  const prev = p.previous_price ? parseFloat(p.previous_price) : NaN;
  return prev > price ? prev : price;
}

// Current discount in percent (up to 2 decimals), or 0 when there is none.
export function discountPctOf(p: { price: string; previous_price: string | null }): number {
  const base = basePriceOf(p);
  const price = parseFloat(p.price);
  if (!(base > price)) return 0;
  return Math.round(((base - price) / base) * 10000) / 100;
}

// Payload for PATCH: a 0% discount clears `previous_price`.
export function discountPayload(basePrice: number, pct: number) {
  return pct > 0
    ? { price: applyDiscount(basePrice, pct), previous_price: basePrice.toFixed(2) }
    : { price: basePrice.toFixed(2), previous_price: null };
}
