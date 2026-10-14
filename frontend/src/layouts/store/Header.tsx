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
import { Bell, Heart, Menu, Search, ShoppingBag, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
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
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.key]);

  const threshold = settings?.shipping.freeShippingThreshold ?? 0;
  const icon = 'relative flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100';

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="bg-ink text-white">
        <p className="container-page flex h-8 items-center justify-center gap-2 text-center text-xs font-medium">
          <Truck className="hidden h-3.5 w-3.5 sm:block" />
          {threshold > 0 ? `Free delivery on orders above ${money(threshold)}` : 'Fast delivery across India'} · Easy {settings?.policies.returnWindowDays ?? 7}-day returns
        </p>
      </div>

      <div className="container-page flex h-16 items-center gap-2 sm:gap-4">
        <IconButton label="Open menu" className="-ml-2 lg:hidden" onClick={() => setMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </IconButton>
        <Logo />
        <SearchBox className="mx-2 hidden max-w-xl flex-1 md:block lg:mx-6" />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button className={clsx(icon, 'md:hidden')} aria-label="Search" onClick={() => setSearchOpen((o) => !o)}>
            <Search className="h-5 w-5" />
          </button>
          {user?.role === 'CUSTOMER' && (
            <Link to="/account/notifications" className={clsx(icon, 'hidden sm:flex')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Bell className="h-5 w-5" />
              <CountBadge count={unread ?? 0} />
            </Link>
          )}
          <Link to="/wishlist" className={icon} aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/cart" className={icon} aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
            <ShoppingBag className="h-5 w-5" />
            <CountBadge count={cartCount} />
          </Link>
          <AccountMenu />
        </div>
      </div>

      {searchOpen && (
        <div className="container-page pb-3 md:hidden">
          <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
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
          <NavLink to="/offers" className="ml-auto font-semibold text-rose-600 hover:text-rose-700">Offers</NavLink>
          <NavLink to="/about" className="hover:text-stone-900">About</NavLink>
          <NavLink to="/contact" className="hover:text-stone-900">Contact</NavLink>
        </div>
      </nav>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
