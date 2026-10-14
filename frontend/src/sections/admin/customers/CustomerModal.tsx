import { OrderBadge } from '@/components/admin/StatusBadges';
import { buttonClass } from '@/components/ui/Button';
import { Badge, ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { adminCustomerService } from '@/services/adminService';
import { formatAddress } from '@/utils/address';
import { formatDate, formatDateTime, money } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

export function CustomerModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'customer', id], queryFn: () => adminCustomerService.get(id) });
  return (
    <Modal open onClose={onClose} title="Customer" size="lg">
      {isLoading ? <PageSpinner /> : error || !data ? <ErrorState error={error} compact /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">{data.name} {!data.isActive && <Badge tone="danger">Disabled</Badge>}</p>
              <p className="text-sm text-slate-600">{data.email}{data.phone && ` · +91 ${data.phone}`}</p>
              <p className="text-xs text-slate-500">Registered {formatDate(data.createdAt)} · Last sign-in {data.lastLoginAt ? formatDateTime(data.lastLoginAt) : 'never'}</p>
            </div>
            <Link to={`/admin/orders?customerId=${data.id}`} className={buttonClass('outline', 'sm')}>View orders</Link>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Orders</dt><dd className="text-lg font-semibold">{data.orderCount}</dd></div>
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Total spending</dt><dd className="text-lg font-semibold">{money(data.totalSpent)}</dd></div>
            <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Wishlist items</dt><dd className="text-lg font-semibold">{data.wishlistCount}</dd></div>
          </dl>
          <div>
            <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Recent orders</h3>
            {data.recentOrders.length === 0 ? <p className="text-sm text-slate-500">No orders yet.</p> : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {data.recentOrders.map((o) => (
                  <li key={o.id}><Link to={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-slate-50"><span className="font-semibold">{o.orderNumber}</span><span className="text-slate-500">{formatDate(o.createdAt)}</span><OrderBadge status={o.status} /><span className="font-semibold tabular-nums">{money(o.total)}</span></Link></li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Addresses</h3>
              {data.addresses.length === 0 ? <p className="text-sm text-slate-500">None saved.</p> : data.addresses.map((a) => <p key={a.id} className="mb-2 text-sm text-slate-600"><span className="font-medium text-slate-800">{a.fullName}</span> — {formatAddress(a)}</p>)}
            </div>
            <div>
              <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Activity</h3>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {data.reviews.map((r) => <li key={r.id}>Reviewed <span className="font-medium text-slate-800">{r.product.name}</span> ({r.rating}★) · {formatDate(r.createdAt)}</li>)}
                {data.tickets.map((t) => <li key={t.id}>Support: “{t.subject}” ({t.status.toLowerCase().replace('_', ' ')}) · {formatDate(t.createdAt)}</li>)}
                {data.reviews.length + data.tickets.length === 0 && <li className="text-slate-500">No reviews or support requests.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
