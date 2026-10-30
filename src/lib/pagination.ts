import { useCallback, useState } from 'react';
import api from '@/lib/axios';

export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

// The API returns absolute `next`/`previous` URLs. Keep only path + query so the
// request still goes through `api` (base URL, auth header, token refresh).
// The cursor token itself is opaque and is never built or edited here.
export const toApiPath = (url: string) => {
  const u = new URL(url, 'http://placeholder');
  return u.pathname + u.search;
};

// Load every page of a cursor-paginated list. Use for small reference lists
// (brands, payment methods, staff...) that the page filters/slices locally.
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

// Previous/next navigation over a cursor-paginated endpoint.
// `cursor` is null on the first page; call `reset()` when filters, search or
// ordering change so the list starts over from the first page.
export function useCursorPagination() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [links, setLinks] = useState<{ next: string | null; previous: string | null }>({ next: null, previous: null });

  const reset = useCallback(() => {
    setCursor(null);
    setPageNumber(1);
  }, []);

  const goNext = () => {
    if (!links.next) return;
    setCursor(toApiPath(links.next));
    setPageNumber(n => n + 1);
  };

  const goPrevious = () => {
    if (!links.previous) return;
    setCursor(toApiPath(links.previous));
    setPageNumber(n => Math.max(1, n - 1));
  };

  // Fetch the current page: the stored cursor URL already carries the filters.
  const fetchPage = useCallback(async <T,>(url: string, params: Record<string, unknown>): Promise<T[]> => {
    const { data } = cursor ? await api.get(cursor) : await api.get(url, { params });
    setLinks({ next: data.next ?? null, previous: data.previous ?? null });
    return (data.results ?? data) as T[];
  }, [cursor]);

  return {
    cursor,
    pageNumber,
    hasNext: !!links.next,
    hasPrevious: !!links.previous,
    goNext,
    goPrevious,
    reset,
    fetchPage,
  };
}
