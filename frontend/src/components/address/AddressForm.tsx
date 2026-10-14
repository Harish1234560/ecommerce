import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Checkbox, fieldErrors, Input, Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { INDIAN_STATES } from '@/constants';
import { addressService } from '@/services/accountService';
import { toast } from '@/store/toast';
import type { Address } from '@/types';
import { isValidPhone, isValidPincode } from '@/utils/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

type AddressFormState = Omit<Address, 'id' | 'apartment' | 'street' | 'landmark'> & { apartment: string; street: string; landmark: string };

const EMPTY_ADDRESS: AddressFormState = { fullName: '', phone: '', address: '', apartment: '', street: '', city: '', state: '', pincode: '', landmark: '', isDefault: false };

export function AddressFormModal({ open, onClose, address, onSaved }: { open: boolean; onClose: () => void; address?: Address | null; onSaved?: (a: Address) => void }) {
  return (
    <Modal open={open} onClose={onClose} title={address ? 'Edit address' : 'Add a new address'} size="lg">
      {open && <AddressForm address={address} onCancel={onClose} onSaved={(a) => { onSaved?.(a); onClose(); }} />}
    </Modal>
  );
}

function AddressForm({ address, onCancel, onSaved }: { address?: Address | null; onCancel: () => void; onSaved: (a: Address) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<AddressFormState>(address ? { ...address, apartment: address.apartment ?? '', street: address.street ?? '', landmark: address.landmark ?? '' } : EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof AddressFormState>(k: K, v: AddressFormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const save = useMutation({
    mutationFn: () => (address ? addressService.update(address.id, form) : addressService.create(form)),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(address ? 'Address updated' : 'Address added');
      onSaved(saved);
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Enter the full name';
    if (!isValidPhone(form.phone)) next.phone = 'Enter a valid 10-digit Indian mobile number';
    if (form.address.trim().length < 5) next.address = 'Enter the address';
    if (form.city.trim().length < 2) next.city = 'Enter the city';
    if (!form.state) next.state = 'Select the state';
    if (!isValidPincode(form.pincode)) next.pincode = 'Enter a valid 6-digit PIN code';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input label="Full name" required autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} />
      <Input label="Phone" required type="tel" inputMode="tel" autoComplete="tel" prefix="+91" className="!pl-12" maxLength={14} value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} />
      <Input label="Address" required wrapperClassName="sm:col-span-2" autoComplete="address-line1" placeholder="House no., building, area" value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
      <Input label="Apartment / House" autoComplete="address-line2" value={form.apartment} onChange={(e) => set('apartment', e.target.value)} error={errors.apartment} />
      <Input label="Street" value={form.street} onChange={(e) => set('street', e.target.value)} error={errors.street} />
      <Input label="City" required autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} error={errors.city} />
      <Select label="State" required autoComplete="address-level1" value={form.state} onChange={(e) => set('state', e.target.value)} error={errors.state}>
        <option value="">Select state</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <Input label="PIN code" required inputMode="numeric" autoComplete="postal-code" maxLength={6} value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} error={errors.pincode} />
      <Input label="Landmark" placeholder="Optional" value={form.landmark} onChange={(e) => set('landmark', e.target.value)} error={errors.landmark} />
      <Checkbox className="sm:col-span-2" label="Make this my default address" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={save.isPending}>{address ? 'Save changes' : 'Save address'}</Button>
      </div>
    </form>
  );
}
