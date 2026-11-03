import { useEffect } from 'react';

// Admin pages scroll inside AdminLayout's main column, not the window.
export const ADMIN_SCROLL_ID = 'admin-scroll';

const RETURN_KEY = 'admin:listReturn';

const scroller = () => document.getElementById(ADMIN_SCROLL_ID);

export function scrollAdminToTop() {
  scroller()?.scrollTo({ top: 0, behavior: 'smooth' });
}

// Call before leaving a list for a detail/edit page, so the user can be sent
// back to the same filters, page and scroll position afterwards.
export function rememberListPosition() {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({
      url: window.location.pathname + window.location.search,
      y: scroller()?.scrollTop ?? 0,
    }));
  } catch { /* storage unavailable: fall back to the plain list URL */ }
}

function readReturn(): { url: string; y: number } | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// URL of the list the user came from, if it is under `listPath`.
export function listReturnUrl(listPath: string) {
  const saved = readReturn();
  return saved && saved.url.split('?')[0] === listPath ? saved.url : listPath;
}

// Restore the remembered scroll position once the list content has loaded.
export function useRestoreListScroll(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const saved = readReturn();
    if (!saved || saved.url !== window.location.pathname + window.location.search) return;
    try { sessionStorage.removeItem(RETURN_KEY); } catch { /* ignore */ }
    requestAnimationFrame(() => scroller()?.scrollTo({ top: saved.y }));
  }, [ready]);
}
