import { SocialIcon } from '@/components/common/SocialIcon';
import { clsx } from '@/components/ui';
import { useCategories, useSettings } from '@/hooks/useSettings';
import { Logo } from '@/layouts/store/Logo';
import { useAuth } from '@/store/auth';
import { Link } from 'react-router-dom';

export function Footer() {
  const { data: settings } = useSettings();
  const { data: categories } = useCategories();
  const user = useAuth((s) => s.user);
  const store = settings?.store;
  const social = Object.entries(settings?.social ?? {}).filter(([k, v]) => v && k !== 'whatsapp');
  const col = 'space-y-2.5 text-sm text-stone-400';
  const a = 'transition-colors hover:text-white';
  return (
    <footer className="mt-16 bg-ink text-stone-300">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-6 text-stone-400">{store?.tagline}. Quality products, honest prices and service you can rely on.</p>
          {social.length > 0 && (
            <div className="mt-5 flex gap-2">
              {social.map(([name, url]) => (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-stone-300 transition-colors hover:bg-white hover:text-ink">
                  <SocialIcon name={name} className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-white">Shop</h3>
          <ul className={col}>
            <li><Link to="/products" className={a}>All products</Link></li>
            {categories?.slice(0, 6).map((c) => (
              <li key={c.id}><Link to={`/category/${c.slug}`} className={a}>{c.name}</Link></li>
            ))}
            <li><Link to="/offers" className={a}>Offers &amp; deals</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-white">Account</h3>
          <ul className={col}>
            {user ? <li><Link to="/account/profile" className={a}>My profile</Link></li> : <li><Link to="/login" className={a}>Sign in</Link></li>}
            {!user && <li><Link to="/register" className={a}>Create account</Link></li>}
            <li><Link to="/account/orders" className={a}>My orders</Link></li>
            <li><Link to="/wishlist" className={a}>Wishlist</Link></li>
            <li><Link to="/cart" className={a}>Cart</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-white">Company</h3>
          <ul className={col}>
            <li><Link to="/about" className={a}>About us</Link></li>
            <li><Link to="/contact" className={a}>Contact us</Link></li>
            <li><Link to="/shipping-policy" className={a}>Shipping policy</Link></li>
            <li><Link to="/return-policy" className={a}>Returns &amp; refunds</Link></li>
            <li><Link to="/privacy" className={a}>Privacy policy</Link></li>
            <li><Link to="/terms" className={a}>Terms &amp; conditions</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-white">Customer support</h3>
          <ul className={col}>
            {store?.phone && <li><a href={`tel:${store.phone.replace(/\s/g, '')}`} className={a}>{store.phone}</a></li>}
            {store?.email && <li><a href={`mailto:${store.email}`} className={clsx(a, 'break-all')}>{store.email}</a></li>}
            {store?.businessHours && <li>{store.businessHours}</li>}
            {store?.address && <li className="leading-6">{store.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {store?.name ?? 'ShopHub'}. All rights reserved.</p>
          <p>Secure payments · UPI · Cards · Net Banking · Wallets · Cash on Delivery</p>
        </div>
      </div>
    </footer>
  );
}
