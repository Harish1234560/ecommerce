import { errorMessage } from '@/api/client';
import { AddressFormModal } from '@/components/address/AddressForm';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useAddresses } from '@/hooks/useAddresses';
import { useSeo } from '@/hooks/useSeo';
import { addressService } from '@/services/accountService';
import { toast } from '@/store/toast';
import type { Address } from '@/types';
import { formatAddress } from '@/utils/address';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function AddressesPage() {
  useSeo({ title: 'My Addresses', noindex: true });
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useAddresses();
  const [editing, setEditing] = useState<Address | null | undefined>(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState<Address | null>(null);

  const setDefault = useMutation({
    mutationFn: (id: string) => addressService.setDefault(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => addressService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">My addresses</h1>
        <Button size="sm" onClick={() => setEditing(null)} icon={<Plus className="h-4 w-4" />}>Add address</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <div className="card"><EmptyState icon={<MapPin />} title="No saved addresses" message="Add an address to speed up checkout." action={<Button onClick={() => setEditing(null)}>Add address</Button>} /></div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((a) => (
            <li key={a.id} className="card flex flex-col p-5">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-stone-900">{a.fullName}</p>
                {a.isDefault && <Badge tone="success">Default</Badge>}
              </div>
              <p className="mt-1.5 text-sm leading-6 text-stone-600">{formatAddress(a)}</p>
              <p className="mt-1 text-sm text-stone-600">Phone: +91 {a.phone}</p>
              <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">
                <Button size="sm" variant="ghost" onClick={() => setEditing(a)} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setDeleting(a)} icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
                {!a.isDefault && <Button size="sm" variant="ghost" className="ml-auto" loading={setDefault.isPending && setDefault.variables === a.id} onClick={() => setDefault.mutate(a.id)}>Set as default</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressFormModal open={editing !== undefined} address={editing} onClose={() => setEditing(undefined)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger title="Delete address?" confirmLabel="Delete" message={deleting ? `${deleting.fullName}, ${formatAddress(deleting)}` : ''} />
    </div>
  );
}
