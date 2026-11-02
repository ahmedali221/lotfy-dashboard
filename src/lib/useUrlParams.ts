import { useEffect } from 'react';

// Mirror list state (filters, search, page) into the query string so Back from
// a detail page restores the same list. Uses history.replaceState, which Next
// keeps in sync with useSearchParams, so changes never add history entries.
// Empty values remove their key; keys owned by other calls are kept.
export function useSyncUrlParams(values: Record<string, string | null>) {
  const serialized = JSON.stringify(values);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    if (qs !== window.location.search.replace(/^\?/, '')) {
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    }
  }, [serialized]); // eslint-disable-line react-hooks/exhaustive-deps
}
