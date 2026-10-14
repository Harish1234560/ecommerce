import { clsx } from '@/components/ui';
import { IconButton } from '@/components/ui/Button';
import { useCategories } from '@/hooks/useSettings';
import { Logo } from '@/layouts/store/Logo';
import { toast } from '@/store/toast';
import { useAuth } from '@/store/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Heart, LayoutDashboard, LogOut, MapPin, Package, User as UserIcon, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { data: categories } = useCategories();
  const navigate = useNavigate();
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  const link = 'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-stone-800 active:bg-stone-100';
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-stone-950/50" onClick={onClose} />
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white"
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <Logo />
              <IconButton label="Close menu" onClick={onClose}><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-4">
              {user ? (
                <div>
                  <p className="font-semibold text-stone-900">Hi, {user.name.split(' ')[0]}</p>
                  <p className="text-sm text-stone-500">{user.email}</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={onClose} className="btn-primary flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold">Sign in</Link>
                  <Link to="/register" onClick={onClose} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white text-sm font-semibold text-stone-800">Register</Link>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-5 px-3 py-4">
              <div>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Shop</p>
                <Link to="/products" onClick={onClose} className={link}>All products</Link>
                {categories?.map((c) => (
                  <Link key={c.id} to={`/category/${c.slug}`} onClick={onClose} className={link}>{c.name}</Link>
                ))}
                <Link to="/offers" onClick={onClose} className={clsx(link, 'text-rose-600')}>Offers &amp; deals</Link>
              </div>
              {user && (
                <div>
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Account</p>
                  {user.role === 'ADMIN' && <Link to="/admin" onClick={onClose} className={clsx(link, 'text-indigo-700')}><LayoutDashboard className="h-5 w-5" /> Admin dashboard</Link>}
                  <Link to="/account/profile" onClick={onClose} className={link}><UserIcon className="h-5 w-5 text-stone-500" /> My profile</Link>
                  <Link to="/account/orders" onClick={onClose} className={link}><Package className="h-5 w-5 text-stone-500" /> My orders</Link>
                  <Link to="/wishlist" onClick={onClose} className={link}><Heart className="h-5 w-5 text-stone-500" /> Wishlist</Link>
                  <Link to="/account/notifications" onClick={onClose} className={link}><Bell className="h-5 w-5 text-stone-500" /> Notifications</Link>
                  <Link to="/account/addresses" onClick={onClose} className={link}><MapPin className="h-5 w-5 text-stone-500" /> Addresses</Link>
                </div>
              )}
              <div>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Help</p>
                <Link to="/about" onClick={onClose} className={link}>About us</Link>
                <Link to="/contact" onClick={onClose} className={link}>Contact us</Link>
                <Link to="/shipping-policy" onClick={onClose} className={link}>Shipping policy</Link>
                <Link to="/return-policy" onClick={onClose} className={link}>Returns &amp; refunds</Link>
              </div>
            </div>
            {user && (
              <button
                className="m-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 text-sm font-semibold text-rose-600"
                onClick={async () => {
                  await logout();
                  onClose();
                  toast.success('Signed out');
                  navigate('/');
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            )}
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
