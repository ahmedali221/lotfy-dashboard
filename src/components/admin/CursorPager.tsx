'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CursorPagerProps {
  pageNumber: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
  className?: string;
}

// Previous/next controls for cursor-paginated lists. The API no longer returns
// a total count, so only the current page number is shown.
export function CursorPager({ pageNumber, hasNext, hasPrevious, onNext, onPrevious, disabled, className = '' }: CursorPagerProps) {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  if (!hasNext && !hasPrevious) return null;

  const btn = 'p-1.5 border border-border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors';

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <p className="text-sm text-muted-foreground">{t(`صفحة ${pageNumber}`, `Page ${pageNumber}`)}</p>
      <div className="flex items-center gap-2">
        <button onClick={onPrevious} disabled={disabled || !hasPrevious} className={btn} title={t('السابق', 'Previous')}>
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <button onClick={onNext} disabled={disabled || !hasNext} className={btn} title={t('التالي', 'Next')}>
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
