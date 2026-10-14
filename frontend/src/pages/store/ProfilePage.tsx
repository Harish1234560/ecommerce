import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Feedback';
import { fieldErrors, Input } from '@/components/ui/Form';
import { useSeo } from '@/hooks/useSeo';
import { uploadService } from '@/services/accountService';
import { authService } from '@/services/authService';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import type { User } from '@/types';
import { formatDate } from '@/utils/format';
import { isValidPhone } from '@/utils/validation';
import { useMutation } from '@tanstack/react-query';
import { Camera, Headphones, LogOut, MapPin, Package, Pencil } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function ProfilePage() {
  useSeo({ title: 'My Profile', noindex: true });
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: (body: Partial<Pick<User, 'name' | 'phone' | 'avatarUrl'>>) => authService.updateProfile(body),
    onSuccess: (u) => {
      setUser(u);
      setEditing(false);
      toast.success('Profile updated');
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });
  const changePassword = useMutation({
    mutationFn: () => authService.changePassword(pw.currentPassword, pw.newPassword),
    onSuccess: () => {
      toast.success('Password changed. Other devices have been signed out.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: (err) => {
      setPwErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });

  if (!user) return null;

  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter your full name';
    if (phone && !isValidPhone(phone)) next.phone = 'Enter a valid 10-digit Indian mobile number';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate({ name: name.trim(), phone: phone || null });
  };
  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!pw.currentPassword) next.currentPassword = 'Enter your current password';
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) next.newPassword = 'At least 8 characters with a letter and a number';
    if (pw.confirm !== pw.newPassword) next.confirm = 'Passwords do not match';
    setPwErrors(next);
    if (Object.keys(next).length === 0) changePassword.mutate();
  };
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const [url] = await uploadService.images([file]);
      if (url) save.mutate({ avatarUrl: url });
    } catch (err) {
      toast.error(errorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const shortcut = 'card flex items-center gap-3 p-4 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:shadow-card';
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">My profile</h1>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-display text-3xl font-bold text-brand-800">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
            </div>
            <button onClick={() => fileInput.current?.click()} aria-label="Change profile photo" className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-ink text-white transition hover:bg-stone-700">
              {uploading ? <Spinner className="h-4 w-4 text-white" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void uploadAvatar(e.target.files?.[0])} />
          </div>

          {editing ? (
            <form onSubmit={submitProfile} noValidate className="grid flex-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
              <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} autoComplete="tel" placeholder="10-digit mobile number" />
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" size="sm" loading={save.isPending}>Save changes</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setName(user.name); setPhone(user.phone ?? ''); setErrors({}); }}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-stone-900">{user.name}</p>
              <dl className="mt-2 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                <div><dt className="inline text-stone-500">Email: </dt><dd className="inline break-all font-medium text-stone-900">{user.email}</dd></div>
                <div><dt className="inline text-stone-500">Phone: </dt><dd className="inline font-medium text-stone-900">{user.phone ? `+91 ${user.phone}` : 'Not added'}</dd></div>
                <div><dt className="inline text-stone-500">Member since: </dt><dd className="inline font-medium text-stone-900">{formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</dd></div>
                <div><dt className="inline text-stone-500">Account type: </dt><dd className="inline font-medium text-stone-900">{user.role === 'ADMIN' ? 'Administrator' : 'Customer'}</dd></div>
              </dl>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setEditing(true)} icon={<Pencil className="h-3.5 w-3.5" />}>Edit profile</Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/account/orders" className={shortcut}><Package className="h-5 w-5 text-brand-700" /> Manage orders</Link>
        <Link to="/account/addresses" className={shortcut}><MapPin className="h-5 w-5 text-brand-700" /> Manage addresses</Link>
        <Link to="/contact" className={shortcut}><Headphones className="h-5 w-5 text-brand-700" /> Help &amp; support</Link>
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-stone-900">Change password</h2>
        <form onSubmit={submitPassword} noValidate className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
          <Input label="Current password" type="password" autoComplete="current-password" wrapperClassName="sm:col-span-2" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwErrors.currentPassword} />
          <Input label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwErrors.newPassword} hint="At least 8 characters with a letter and a number" />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} />
          <div className="sm:col-span-2"><Button type="submit" loading={changePassword.isPending}>Update password</Button></div>
        </form>
      </section>

      <Button variant="outline" className="text-rose-600" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await logout(); toast.success('Signed out'); navigate('/'); }}>
        Logout
      </Button>
    </div>
  );
}
