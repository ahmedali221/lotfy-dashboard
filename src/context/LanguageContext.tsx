'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar');
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const toggleLanguage = () => setLanguage(prev => (prev === 'ar' ? 'en' : 'ar'));

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: (key) => t(key) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
