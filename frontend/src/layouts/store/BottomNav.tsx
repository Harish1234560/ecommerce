import { clsx } from '@/components/ui';
import { Img } from '@/components/ui/Img';
import { Modal } from '@/components/ui/Modal';
import { useCategories } from '@/hooks/useSettings';
import { useWishlist } from '@/hooks/useWishlist';
import { FOCUS_SEARCH_EVENT } from '@/layouts/store/SearchBox';
import { useAuth } from '@/store/auth';
import { motion } from 'framer-motion';
import { ChevronRight, Heart, Home, LayoutGrid, Search, User, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Pages with their own pinned action bar (Add to Cart, Checkout, Pay) hide the navigation so two
// bars never compete for the bottom of the screen.
const HIDDEN_ON = [/^\/product\//, /^\/cart$/, /^\/checkout/, /^\/order\/success\//];

export function useBottomNavVisible() {
  const { pathname } = useLocation();
  return !HIDDEN_ON.some((re) => re.test(pathname));
}

// Phone navigation, fixed to the bottom edge within thumb reach. Hidden from tablet width up,
// where the header carries the same destinations.
export function BottomNav() {
  const { pathname } = useLocation();
  const user = useAuth((s) => s.user);
  const wishlist = useWishlist();
  const { data: categories } = useCategories();
  const [sheet, setSheet] = useState(false);
  useEffect(() => setSheet(false), [pathname]);

  const account = user ? '/account/profile' : '/login';
  const active = sheet
    ? 'categories'
    : pathname === '/'
      ? 'home'
      : /^\/(category|products)/.test(pathname)
        ? 'categories'
        : pathname.startsWith('/search')
          ? 'search'
          : pathname.startsWith('/wishlist')
            ? 'wishlist'
            : /^\/(account|login|register)/.test(pathname)
              ? 'account'
              : '';

  const item = (key: string, label: string, Icon: LucideIcon, badge = 0) => (
    <span className={clsx('relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors', active === key ? 'text-brand-700' : 'text-stone-500')}>
      {active === key && <motion.span layoutId="bottom-nav-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600" transition={{ duration: 0.2 }} />}
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" strokeWidth={active === key ? 2.4 : 2} aria-hidden />
        {badge > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>}
      </span>
      {label}
    </span>
  );
  const cell = 'flex h-full min-w-0 flex-1';

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-nav border-t border-stone-200 bg-white/95 pb-safe-b shadow-bar backdrop-blur md:hidden">
        <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-lg items-stretch">
          <Link to="/" className={cell} aria-current={active === 'home' ? 'page' : undefined}>{item('home', 'Home', Home)}</Link>
          <button type="button" className={cell} aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>{item('categories', 'Categories', LayoutGrid)}</button>
          <button type="button" className={cell} onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}>{item('search', 'Search', Search)}</button>
          <Link to="/wishlist" className={cell} aria-current={active === 'wishlist' ? 'page' : undefined}>{item('wishlist', 'Wishlist', Heart, wishlist.count)}</Link>
          <Link to={account} className={cell} aria-current={active === 'account' ? 'page' : undefined}>{item('account', user ? 'Account' : 'Sign in', User)}</Link>
        </div>
      </nav>

      <Modal open={sheet} onClose={() => setSheet(false)} title="Shop by category">
        <ul className="-mx-2">
          <li>
            <Link to="/products" className="flex min-h-[56px] items-center gap-3 rounded-xl px-2 text-[15px] font-semibold text-stone-900 active:bg-stone-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><LayoutGrid className="h-5 w-5" /></span>
              <span className="flex-1">All products</span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </Link>
          </li>
          {categories?.map((c) => (
            <li key={c.id}>
              <Link to={`/category/${c.slug}`} className="flex min-h-[56px] items-center gap-3 rounded-xl px-2 text-[15px] font-medium text-stone-800 active:bg-stone-100">
                <Img src={c.imageUrl} alt="" preset="thumb" className="h-11 w-11 shrink-0 rounded-xl bg-stone-100 object-cover" />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-xs text-stone-400">{c.productCount}</span>
                <ChevronRight className="h-4 w-4 text-stone-400" />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/offers" className="flex min-h-[56px] items-center gap-3 rounded-xl px-2 text-[15px] font-semibold text-accent-700 active:bg-stone-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-lg">%</span>
              <span className="flex-1">Offers &amp; deals</span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </Link>
          </li>
        </ul>
      </Modal>
    </>
  );
}
