import { buttonClass } from '@/components/ui/Button';
import { useSeo } from '@/hooks/useSeo';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  useSeo({ title: 'Page Not Found', noindex: true });
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-7xl font-extrabold text-stone-200">404</p>
      <h1 className="mt-2 text-2xl font-bold text-stone-900">We could not find that page</h1>
      <p className="mt-2 max-w-sm text-sm text-stone-500">The link may be broken or the page may have been removed.</p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className={buttonClass('primary')}>Go home</Link>
        <Link to="/products" className={buttonClass('outline')}>Browse products</Link>
      </div>
    </div>
  );
}
