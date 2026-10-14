import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-stone-500">
      <Link to="/" className="hover:text-stone-900">
        Home
      </Link>
      {items.map((item) => (
        <Fragment key={item.label}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
          {item.to ? (
            <Link to={item.to} className="hover:text-stone-900">
              {item.label}
            </Link>
          ) : (
            <span className="line-clamp-1 font-medium text-stone-800" aria-current="page">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
