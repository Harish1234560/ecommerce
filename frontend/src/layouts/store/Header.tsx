import { clsx } from '@/components/ui';
import { IconButton } from '@/components/ui/Button';
import { useCartCount } from '@/hooks/useCart';
import { useCategories, useSettings, useUnreadCount } from '@/hooks/useSettings';
import { AccountMenu } from '@/layouts/store/AccountMenu';
import { Logo } from '@/layouts/store/Logo';
import { MobileMenu } from '@/layouts/store/MobileMenu';
import { SearchBox } from '@/layouts/store/SearchBox';
import { useAuth } from '@/store/auth';
import { money } from '@/utils/format';
import { Bell, Heart, Menu, ShoppingBag, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    // Re-mounting on every change replays the "pop" so the customer sees the cart react.
    <span key={count} className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Header() {
  const user = useAuth((s) => s.user);
  const { data: settings } = useSettings();
  const { data: categories } = useCategories();
  const cartCount = useCartCount();
  const { data: unread } = useUnreadCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.key]);

  const threshold = settings?.shipping.freeShippingThreshold ?? 0;
  const icon = 'pressable relative flex h-11 w-11 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100';
  // Checkout keeps the customer focused: no search row on phones.
  const focused = location.pathname.startsWith('/checkout');

  return (
    <>
      {/* Scrolls away with the page so the pinned header stays compact. */}
      <div className="bg-brand-900 text-white">
        <p className="container-page flex min-h-8 items-center justify-center gap-2 py-1.5 text-center text-xs font-medium">
          <Truck className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
          {threshold > 0 ? `Free delivery on orders above ${money(threshold)}` : 'Fast delivery across India'} · Easy {settings?.policies.returnWindowDays ?? 7}-day returns
        </p>
      </div>

      <header className="sticky top-0 z-header border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container-page flex h-14 items-center gap-1 md:h-16 md:gap-4">
          <IconButton label="Open menu" className="-ml-2.5 lg:hidden" onClick={() => setMenuOpen(true)}>
            <Menu className="h-[22px] w-[22px]" />
          </IconButton>
          <Logo />
          <SearchBox className="mx-2 hidden max-w-xl flex-1 md:block lg:mx-6" />
          <div className="-mr-2 ml-auto flex items-center md:mr-0 md:gap-1">
            {user?.role === 'CUSTOMER' && (
              <Link to="/account/notifications" className={clsx(icon, 'hidden sm:flex')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                <Bell className="h-[22px] w-[22px]" />
                <CountBadge count={unread ?? 0} />
              </Link>
            )}
            <Link to="/wishlist" className={icon} aria-label="Wishlist">
              <Heart className="h-[22px] w-[22px]" />
            </Link>
            <Link to="/cart" className={icon} aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`} data-cart-target>
              <ShoppingBag className="h-[22px] w-[22px]" />
              <CountBadge count={cartCount} />
            </Link>
            <AccountMenu />
          </div>
        </div>

        {!focused && (
          <div className="container-page pb-2.5 md:hidden">
            <SearchBox />
          </div>
        )}

        <nav className="hidden border-t border-stone-100 lg:block" aria-label="Categories">
          <div className="container-page flex h-11 items-center gap-7 text-sm font-medium text-stone-600">
            <NavLink to="/products" className={({ isActive }) => clsx('transition-colors hover:text-stone-900', isActive && 'text-stone-900')}>All products</NavLink>
            {categories?.slice(0, 8).map((c) => (
              <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => clsx('transition-colors hover:text-stone-900', isActive && 'text-stone-900')}>
                {c.name}
              </NavLink>
            ))}
            <NavLink to="/offers" className="ml-auto font-semibold text-accent-700 hover:text-accent-800">Offers</NavLink>
            <NavLink to="/about" className="hover:text-stone-900">About</NavLink>
            <NavLink to="/contact" className="hover:text-stone-900">Contact</NavLink>
          </div>
        </nav>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
