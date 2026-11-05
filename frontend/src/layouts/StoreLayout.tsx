import { OfflineBanner } from '@/components/common/OfflineBanner';
import { clsx } from '@/components/ui';
import { BottomNav, useBottomNavVisible } from '@/layouts/store/BottomNav';
import { Footer } from '@/layouts/store/Footer';
import { Header } from '@/layouts/store/Header';
import { Outlet } from 'react-router-dom';

export function StoreLayout() {
  const bottomNav = useBottomNavVisible();
  return (
    // On phones the page ends above the fixed bottom navigation, so it never covers content.
    <div className={clsx('flex min-h-screen flex-col', bottomNav && 'pb-bottom-nav md:pb-0')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-toast focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lift">
        Skip to content
      </a>
      <OfflineBanner />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {bottomNav && <BottomNav />}
    </div>
  );
}
