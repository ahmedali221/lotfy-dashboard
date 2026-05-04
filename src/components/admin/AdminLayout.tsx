'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Truck,
  Settings,
  Newspaper,
} from 'lucide-react';

const baseNavItems = [
  { href: '/admin/dashboard',      icon: LayoutDashboard, ar: 'لوحة التحكم', en: 'Dashboard'        },
  { href: '/admin/products',       icon: Package,         ar: 'المنتجات',    en: 'Products'         },
  { href: '/admin/brands',         icon: Tag,             ar: 'الماركات',    en: 'Brands'           },
  { href: '/admin/articles',       icon: Newspaper,       ar: 'المقالات',    en: 'Articles'         },
  { href: '/admin/orders',         icon: ShoppingCart,    ar: 'الطلبات',     en: 'Orders'           },
  { href: '/admin/payment-methods',icon: CreditCard,      ar: 'طرق الدفع',   en: 'Payment Methods'  },
  { href: '/admin/delivery-fees',  icon: Truck,           ar: 'رسوم التوصيل',en: 'Delivery Fees'    },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { language, toggleLanguage } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRTL = language === 'ar';

  const navItems = [...baseNavItems, { href: '/admin/settings', icon: Settings, ar: 'الإعدادات', en: 'Settings' }];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefresh');
      localStorage.removeItem('adminUser');
      document.cookie = 'adminToken=; path=/; max-age=0';
    }
    router.push('/admin/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-light">
        {!collapsed && (
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">لطفي للبصريات</h2>
            <p className="text-primary text-xs">LOTFY OPTICAL</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-2 text-white/60 hover:text-white rounded-lg transition-colors hidden md:flex"
        >
          {collapsed
            ? (isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />)
            : (isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />)}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-white/70 hover:bg-secondary-light hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">
                  {language === 'ar' ? item.ar : item.en}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-secondary-light space-y-1">
        {/* <button
          onClick={toggleLanguage}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-secondary-light hover:text-white transition-colors"
        >
          <Globe className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">{language === 'ar' ? 'English' : 'عربي'}</span>}
        </button> */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-row" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-secondary transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        } flex-shrink-0 h-screen sticky top-0`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" dir={isRTL ? 'rtl' : 'ltr'}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-secondary flex flex-col me-auto">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Topbar */}
        <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-secondary hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-secondary block leading-tight">
                {(() => {
                  try { return JSON.parse(localStorage.getItem('adminUser') || '{}').name || (language === 'ar' ? 'المدير' : 'Admin'); } catch { return language === 'ar' ? 'المدير' : 'Admin'; }
                })()}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
