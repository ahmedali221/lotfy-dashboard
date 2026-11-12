'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ADMIN_SCROLL_ID } from '@/lib/listScroll';

interface InfiniteScrollSentinelProps {
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
  onLoadMore: () => void;
  className?: string;
}

// Placed after a list: loads the next batch when it scrolls into view inside the
// admin scroll column. The button is a fallback for manual loading and retries
// after a failed request, which pauses automatic loading.
export function InfiniteScrollSentinel({ hasMore, loading, failed, onLoadMore, className = '' }: InfiniteScrollSentinelProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || loading || failed) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) onLoadMore(); },
      { root: document.getElementById(ADMIN_SCROLL_ID), rootMargin: '400px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, failed, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className={`flex justify-center ${className}`}>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      ) : (
        <button
          onClick={onLoadMore}
          className="px-4 py-1.5 border border-border rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          {failed ? t('إعادة المحاولة', 'Retry') : t('عرض المزيد', 'Load more')}
        </button>
      )}
    </div>
  );
}
