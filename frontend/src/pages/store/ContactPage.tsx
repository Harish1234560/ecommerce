import { errorMessage } from '@/api/client';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { SocialIcon } from '@/components/common/SocialIcon';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Feedback';
import { fieldErrors, Input, Textarea } from '@/components/ui/Form';
import { useSeo } from '@/hooks/useSeo';
import { useSettings } from '@/hooks/useSettings';
import { TICKET_TONE, TicketThread } from '@/sections/contact/TicketThread';
import { supportService } from '@/services/accountService';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { formatDate } from '@/utils/format';
import { isValidEmail, isValidPhone } from '@/utils/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

export function ContactPage() {
  const { data: settings } = useSettings();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const orderRef = params.get('ref');
  useSeo({ title: 'Contact Us', description: `Get in touch with ${settings?.store.name ?? 'us'} — phone, email, address and business hours.` });

  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', subject: orderRef ? `Help with order ${orderRef}` : '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<string | null>(null);
  const [openTicket, setOpenTicket] = useState<string | null>(params.get('ticket'));
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || (user.phone ?? '') }));
  }, [user]);

  const tickets = useQuery({ queryKey: ['tickets', 'mine'], queryFn: () => supportService.myTickets(), enabled: !!user });
  const send = useMutation({
    mutationFn: () => supportService.create({ ...form, phone: form.phone || undefined, orderId: params.get('order') ?? undefined }),
    onSuccess: (res) => {
      setSent(res.ticketNumber);
      setForm((f) => ({ ...f, subject: '', message: '' }));
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    },
  });
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name';
    if (!isValidEmail(form.email)) next.email = 'Enter a valid email address';
    if (form.phone && !isValidPhone(form.phone)) next.phone = 'Enter a valid 10-digit mobile number';
    if (form.subject.trim().length < 3) next.subject = 'Enter a subject';
    if (form.message.trim().length < 10) next.message = 'Please describe your issue (at least 10 characters)';
    setErrors(next);
    if (Object.keys(next).length === 0) send.mutate();
  };

  const store = settings?.store;
  const social = Object.entries(settings?.social ?? {}).filter(([k, v]) => v && k !== 'whatsapp');
  const info = [
    { icon: MapPin, label: 'Shop address', value: store?.address },
    { icon: Phone, label: 'Phone', value: store?.phone, href: store?.phone ? `tel:${store.phone.replace(/\s/g, '')}` : undefined },
    { icon: Mail, label: 'Email', value: store?.email, href: store?.email ? `mailto:${store.email}` : undefined },
    { icon: Clock, label: 'Business hours', value: store?.businessHours },
  ].filter((i) => i.value);

  return (
    <div className="container-page py-5 lg:py-8">
      <Breadcrumbs items={[{ label: 'Contact us' }]} />
      <h1 className="text-3xl font-bold text-stone-900">Contact us</h1>
      <p className="mt-2 max-w-xl text-stone-500">Questions about an order, a product or a return? Send us a message and we will get back to you.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <ul className="card divide-y divide-stone-200">
            {info.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
                  {href ? <a href={href} className="mt-0.5 block break-words text-sm font-medium text-stone-900 hover:text-brand-700">{value}</a> : <p className="mt-0.5 text-sm font-medium leading-6 text-stone-900">{value}</p>}
                </div>
              </li>
            ))}
            {social.length > 0 && (
              <li className="flex items-center gap-3 p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Follow us</span>
                {social.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-700 transition-colors hover:bg-ink hover:text-white"><SocialIcon name={name} className="h-4 w-4" /></a>
                ))}
              </li>
            )}
          </ul>
          {store?.mapEmbedUrl && (
            <div className="card overflow-hidden">
              <iframe src={store.mapEmbedUrl} title="Shop location on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-64 w-full border-0" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-5 sm:p-7">
            <h2 className="text-lg font-bold text-stone-900">Send us a message</h2>
            {sent && (
              <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200" role="status">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Thanks! Your request <strong>{sent}</strong> has been received. We usually reply within one business day.
              </p>
            )}
            <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Name" required autoComplete="name" value={form.name} onChange={(e) => set('name')(e.target.value)} error={errors.name} />
              <Input label="Email" required type="email" autoComplete="email" value={form.email} onChange={(e) => set('email')(e.target.value)} error={errors.email} />
              <Input label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone')(e.target.value)} error={errors.phone} placeholder="Optional" />
              <Input label="Subject" required value={form.subject} onChange={(e) => set('subject')(e.target.value)} error={errors.subject} />
              <Textarea label="Message" required rows={5} wrapperClassName="sm:col-span-2" value={form.message} onChange={(e) => set('message')(e.target.value)} error={errors.message} maxLength={3000} />
              <div className="sm:col-span-2"><Button type="submit" size="lg" loading={send.isPending} icon={<Send className="h-4 w-4" />}>Send message</Button></div>
            </form>
          </section>

          {user && tickets.data && tickets.data.length > 0 && (
            <section className="card p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900"><MessageSquare className="h-5 w-5 text-stone-400" /> Your support requests</h2>
              <ul className="mt-4 space-y-3">
                {tickets.data.map((t) => (
                  <li key={t.id} className="rounded-xl border border-stone-200 p-4">
                    <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpenTicket(openTicket === t.id ? null : t.id)} aria-expanded={openTicket === t.id}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-stone-900">{t.subject}</span>
                        <span className="text-xs text-stone-500">{t.ticketNumber} · Updated {formatDate(t.updatedAt)} · {t.messageCount} message{t.messageCount === 1 ? '' : 's'}</span>
                      </span>
                      <Badge tone={TICKET_TONE[t.status]}>{t.status.replace('_', ' ').toLowerCase()}</Badge>
                    </button>
                    {openTicket === t.id && <TicketThread id={t.id} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
