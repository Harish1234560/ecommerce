import { clsx } from '@/components/ui';
import { useSettings } from '@/hooks/useSettings';
import { BarChart3, Boxes, CreditCard, ExternalLink, FolderTree, Headphones, Image, LayoutDashboard, Package, RotateCcw, Settings, ShoppingBag, ShoppingCart, Star, Tag, Users } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const NAV: { title: string; items: { to: string; label: string; icon: typeof Package; end?: boolean }[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: FolderTree },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    title: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { to: '/admin/coupons', label: 'Coupons', icon: Tag },
      { to: '/admin/content', label: 'Banners & homepage', icon: Image },
      { to: '/admin/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/admin/support', label: 'Support', icon: Headphones },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: settings } = useSettings();
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-300">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white"><ShoppingBag className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-bold text-white">{settings?.store.name ?? 'ShopHub'}</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Admin</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
            {group.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <Link to="/" className="flex items-center gap-2 border-t border-white/10 px-6 py-4 text-sm text-slate-400 hover:text-white">
        <ExternalLink className="h-4 w-4" /> View storefront
      </Link>
    </div>
  );
}
