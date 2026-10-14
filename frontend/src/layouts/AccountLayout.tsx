import { clsx } from '@/components/ui';
import { useUnreadCount } from '@/hooks/useSettings';
import { useAuth } from '@/store/auth';
import { Bell, Heart, MapPin, Package, Star, User as UserIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const accountLinks = [
  { to: '/account/profile', label: 'Profile', icon: UserIcon },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/notifications', label: 'Notifications', icon: Bell },
  { to: '/account/reviews', label: 'Reviews', icon: Star },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
];

export function AccountLayout() {
  const user = useAuth((s) => s.user);
  const { data: unread } = useUnreadCount();
  return (
    <div className="container-page py-6 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
        <aside className="min-w-0">
          <div className="card hidden p-4 lg:block">
            <p className="truncate font-semibold text-stone-900">{user?.name}</p>
            <p className="truncate text-sm text-stone-500">{user?.email}</p>
          </div>
          <nav aria-label="Account" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:card lg:mx-0 lg:mt-4 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-2">
            {accountLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors lg:rounded-xl lg:border-0 lg:px-3 lg:py-2.5',
                    isActive ? 'border-ink bg-ink text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 lg:bg-transparent',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
                {label === 'Notifications' && !!unread && <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{unread}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
