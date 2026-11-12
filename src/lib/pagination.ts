import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';

// The API returns absolute `next` URLs. Keep only path + query so the
// request still goes through `api` (base URL, auth header, token refresh).
// The cursor token itself is opaque and is never built or edited here.
export const toApiPath = (url: string) => {
  const u = new URL(url, 'http://placeholder');
  return u.pathname + u.search;
};

// Load every page of a cursor-paginated list. Use for small reference lists
// (brand dropdowns, order events...) that the page needs in full.
export async function fetchAllPages<T>(url: string, params: Record<string, unknown> = {}): Promise<T[]> {
  let { data } = await api.get(url, { params: { page_size: 100, ...params } });
  if (Array.isArray(data)) return data as T[];
  const items: T[] = [...data.results];
  while (data.next) {
    ({ data } = await api.get(toApiPath(data.next)));
    items.push(...data.results);
  }
  return items;
}

const MAX_PAGE_SIZE = 100;
const SIZE_KEY = 'admin:infiniteList:';

const currentListKey = () => SIZE_KEY + window.location.pathname + window.location.search;

function readSavedSize(): number {
  try {
    return Number(sessionStorage.getItem(currentListKey())) || 0;
  } catch {
    return 0;
  }
}

function saveSize(size: number) {
  try {
    sessionStorage.setItem(currentListKey(), String(size));
  } catch { /* storage unavailable: Back reloads only the first batch */ }
}

// Infinite scroll over a cursor-paginated endpoint. `load` fetches the first
// batch (call it again when filters change); `loadMore` follows the `next`
// cursor link and appends. The loaded count is remembered per URL, so Back from
// a detail page reloads enough rows to reach the saved scroll position (up to 100).
export function useInfiniteList<T>(pageSize: number) {
  const [items, setItems] = useState<T[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  // Responses from an older `load` (filters changed meanwhile) are dropped.
  const request = useRef(0);

  const load = useCallback(async (url: string, params: Record<string, unknown>) => {
    const id = ++request.current;
    setLoading(true);
    setNext(null);
    setLoadingMore(false);
    setLoadMoreFailed(false);
    try {
      const size = Math.min(MAX_PAGE_SIZE, Math.max(pageSize, readSavedSize()));
      const { data } = await api.get(url, { params: { ...params, page_size: size } });
      if (id !== request.current) return;
      setItems(data.results ?? data);
      setNext(data.next ?? null);
    } catch (err) {
      if (id !== request.current) return;
      setItems([]);
      throw err;
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (!next || loading || loadingMore) return;
    const id = request.current;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const { data } = await api.get(toApiPath(next));
      if (id !== request.current) return;
      setItems(prev => [...prev, ...data.results]);
      setNext(data.next ?? null);
    } catch {
      if (id === request.current) setLoadMoreFailed(true);
    } finally {
      if (id === request.current) setLoadingMore(false);
    }
  }, [next, loading, loadingMore]);

  useEffect(() => {
    if (!loading) saveSize(items.length);
  }, [items, loading]);

  // setItems lets the page patch or drop a row in place after an action,
  // without reloading and losing the rows already scrolled through.
  return { items, setItems, loading, loadingMore, loadMoreFailed, hasMore: !!next, load, loadMore };
}
