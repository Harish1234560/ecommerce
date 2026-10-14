import { clsx } from '@/components/ui';
import { toast } from '@/store/toast';
import { useAuth } from '@/store/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LayoutDashboard, LogOut, MapPin, Package, Star, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => setOpen(false), [location.key]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 sm:flex">
        <UserIcon className="h-5 w-5" /> Sign in
      </Link>
    );
  }
  const item = 'flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50';
  return (
    <div ref={ref} className="relative hidden sm:block">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex h-10 items-center gap-2 rounded-full pl-1.5 pr-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-800">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
        <ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1.5 shadow-lift"
          >
            <div className="border-b border-stone-100 px-4 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-semibold text-stone-900">{user.name}</p>
              <p className="truncate text-xs text-stone-500">{user.email}</p>
            </div>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className={clsx(item, 'font-semibold text-indigo-700')} role="menuitem">
                <LayoutDashboard className="h-4 w-4" /> Admin dashboard
              </Link>
            )}
            <Link to="/account/profile" className={item} role="menuitem"><UserIcon className="h-4 w-4" /> My profile</Link>
            <Link to="/account/orders" className={item} role="menuitem"><Package className="h-4 w-4" /> My orders</Link>
            <Link to="/account/addresses" className={item} role="menuitem"><MapPin className="h-4 w-4" /> Addresses</Link>
            <Link to="/account/reviews" className={item} role="menuitem"><Star className="h-4 w-4" /> My reviews</Link>
            <button
              role="menuitem"
              className={clsx(item, 'w-full border-t border-stone-100 text-rose-600')}
              onClick={async () => {
                await logout();
                toast.success('Signed out');
                navigate('/');
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
