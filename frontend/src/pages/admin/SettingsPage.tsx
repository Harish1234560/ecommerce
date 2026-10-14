import { Card } from '@/components/admin/Card';
import { Tabs } from '@/components/admin/Filters';
import { PageHeader } from '@/components/admin/PageHeader';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Input, Textarea } from '@/components/ui/Form';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { useSeo } from '@/hooks/useSeo';
import { AuditLog } from '@/sections/admin/settings/AuditLog';
import { IntegrationStatus, SettingsGroup, SwitchRow } from '@/sections/admin/settings/SettingsGroup';
import { ShippingZones } from '@/sections/admin/settings/ShippingZones';
import { TaxRules } from '@/sections/admin/settings/TaxRules';
import { adminSettingsService } from '@/services/adminService';
import { toPaise, toRupees } from '@/utils/format';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

type SettingsTab = 'store' | 'shipping' | 'tax' | 'payment' | 'notifications' | 'social' | 'audit';

export function SettingsPage() {
  useSeo({ title: 'Settings — Admin', noindex: true });
  const [tab, setTab] = useState<SettingsTab>('store');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'settings', 'all'], queryFn: () => adminSettingsService.get() });
  if (isLoading) return <PageSpinner />;
  if (error || !data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const s = data.settings;
  const int = data.integrations;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Store details, shipping, tax, payments and notifications" />
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'store', label: 'Store' }, { value: 'shipping', label: 'Shipping' }, { value: 'tax', label: 'Tax' }, { value: 'payment', label: 'Payment' }, { value: 'notifications', label: 'Notifications' }, { value: 'social', label: 'Social' }, { value: 'audit', label: 'Audit log' }]} />
      </div>
      <div className="max-w-3xl space-y-4">
        {tab === 'store' && (
          <>
            <SettingsGroup title="Store" subtitle="Shown in the header, footer, contact page, emails and invoices" groupKey="store" value={s.store}>
              {(d, set, e) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Store name" required value={d.name} onChange={(ev) => set('name', ev.target.value)} error={e.name} />
                  <Input label="Tagline" value={d.tagline} onChange={(ev) => set('tagline', ev.target.value)} />
                  <div className="sm:col-span-2">
                    <p className="mb-1.5 text-sm font-medium text-slate-700">Logo</p>
                    <ImageUploader single value={d.logoUrl ? [d.logoUrl] : []} onChange={(u) => set('logoUrl', u[0] ?? '')} />
                  </div>
                  <Input label="Email" required type="email" value={d.email} onChange={(ev) => set('email', ev.target.value)} error={e.email} />
                  <Input label="Phone" value={d.phone} onChange={(ev) => set('phone', ev.target.value)} />
                  <Textarea label="Address" rows={2} wrapperClassName="sm:col-span-2" value={d.address} onChange={(ev) => set('address', ev.target.value)} />
                  <Input label="Business hours" value={d.businessHours} onChange={(ev) => set('businessHours', ev.target.value)} />
                  <Input label="GSTIN" hint="Printed on invoices" value={d.gstin} onChange={(ev) => set('gstin', ev.target.value)} />
                  <Input label="Google Maps embed URL" wrapperClassName="sm:col-span-2" hint="Google Maps → Share → Embed a map → copy the src URL" value={d.mapEmbedUrl} onChange={(ev) => set('mapEmbedUrl', ev.target.value)} error={e.mapEmbedUrl} />
                </div>
              )}
            </SettingsGroup>
            <SettingsGroup title="Orders & reviews" groupKey="policies" value={s.policies}>
              {(d, set) => (
                <div className="space-y-4">
                  <Input label="Return window (days after delivery)" type="number" min="0" max="90" wrapperClassName="max-w-xs" hint="0 disables returns" value={d.returnWindowDays} onChange={(ev) => set('returnWindowDays', Number(ev.target.value))} />
                  <SwitchRow label="Approve reviews before publishing" hint="New reviews stay hidden until you approve them" checked={d.reviewRequiresApproval} onChange={(v) => set('reviewRequiresApproval', v)} />
                </div>
              )}
            </SettingsGroup>
          </>
        )}

        {tab === 'shipping' && (
          <SettingsGroup title="Shipping" subtitle="Default delivery charges and timelines" groupKey="shipping" value={s.shipping} extra={<ShippingZones zones={data.shippingZones} />}>
            {(d, set, e) => (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Delivery charge" type="number" min="0" prefix="₹" value={toRupees(d.defaultFee)} onChange={(ev) => set('defaultFee', toPaise(ev.target.value))} />
                  <Input label="Free shipping threshold" type="number" min="0" prefix="₹" hint="0 = never free" value={toRupees(d.freeShippingThreshold)} onChange={(ev) => set('freeShippingThreshold', toPaise(ev.target.value))} />
                  <Input label="Processing time (days)" type="number" min="0" value={d.processingDays} onChange={(ev) => set('processingDays', Number(ev.target.value))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Delivery min days" type="number" min="0" value={d.defaultMinDays} onChange={(ev) => set('defaultMinDays', Number(ev.target.value))} />
                    <Input label="Max days" type="number" min="0" value={d.defaultMaxDays} onChange={(ev) => set('defaultMaxDays', Number(ev.target.value))} error={e.defaultMaxDays} />
                  </div>
                </div>
                <SwitchRow label="Deliver outside defined zones" hint="When off, only PIN codes covered by a delivery zone can order" checked={d.deliverOutsideZones} onChange={(v) => set('deliverOutsideZones', v)} />
              </div>
            )}
          </SettingsGroup>
        )}

        {tab === 'tax' && (
          <SettingsGroup title="Tax" subtitle="GST configuration" groupKey="tax" value={s.tax} extra={<TaxRules rules={data.taxRules} />}>
            {(d, set) => (
              <div className="space-y-4">
                <SwitchRow label="Prices include tax" hint="On: product prices are tax-inclusive (MRP). Off: tax is added at checkout." checked={d.pricesIncludeTax} onChange={(v) => set('pricesIncludeTax', v)} />
                <Input label="Default tax rate (%)" type="number" min="0" max="100" step="0.01" wrapperClassName="max-w-xs" hint="Used when no tax rule applies" value={d.defaultRate} onChange={(ev) => set('defaultRate', Number(ev.target.value))} />
              </div>
            )}
          </SettingsGroup>
        )}

        {tab === 'payment' && (
          <>
            <Card title="Payment gateway" subtitle="Credentials are configured in the server environment and are never shown here">
              <div className="space-y-2">
                <IntegrationStatus ok={!int.paymentTestMode}>
                  {int.paymentTestMode ? <>Running the <strong>test gateway</strong> — no real money is collected. Set <code className="rounded bg-slate-100 px-1 text-xs">PAYMENT_GATEWAY=razorpay</code> and the Razorpay keys in <code className="rounded bg-slate-100 px-1 text-xs">server/.env</code> to go live.</> : <>Connected to <strong>Razorpay</strong> (UPI, cards, net banking, wallets).</>}
                </IntegrationStatus>
                <IntegrationStatus ok>Card numbers, CVVs and UPI PINs are handled by the gateway and never stored by this store.</IntegrationStatus>
              </div>
            </Card>
            <SettingsGroup title="Payment options" groupKey="payment" value={s.payment}>
              {(d, set, e) => (
                <div className="space-y-4">
                  <SwitchRow label="Online payments" hint="UPI, credit/debit cards, net banking, wallets" checked={d.onlineEnabled} onChange={(v) => set('onlineEnabled', v)} />
                  <SwitchRow label="Cash on Delivery" hint="Can also be switched off per delivery zone" checked={d.codEnabled} onChange={(v) => set('codEnabled', v)} />
                  {e.onlineEnabled && <p className="text-xs text-rose-600">{e.onlineEnabled}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="COD order limit" type="number" min="0" prefix="₹" hint="0 = no limit" value={toRupees(d.codMaxAmount)} onChange={(ev) => set('codMaxAmount', toPaise(ev.target.value))} />
                    <Input label="Unpaid order expiry (minutes)" type="number" min="5" hint="Unpaid online orders are cancelled after this" value={d.pendingPaymentExpiryMinutes} onChange={(ev) => set('pendingPaymentExpiryMinutes', Number(ev.target.value))} error={e.pendingPaymentExpiryMinutes} />
                  </div>
                </div>
              )}
            </SettingsGroup>
          </>
        )}

        {tab === 'notifications' && (
          <SettingsGroup title="Notifications" subtitle="Customers always get in-app notifications for order updates" groupKey="notifications" value={s.notifications}>
            {(d, set) => (
              <div className="space-y-4">
                <SwitchRow label="Email" hint="Order confirmation, shipping, delivery, cancellation and refund emails" checked={d.emailEnabled} onChange={(v) => set('emailEnabled', v)} />
                <IntegrationStatus ok={int.emailConfigured}>{int.emailConfigured ? 'SMTP is configured — emails are being sent.' : 'SMTP is not configured: emails are written to the server log instead of being sent. Add SMTP settings to server/.env.'}</IntegrationStatus>
                <SwitchRow label="SMS" hint="Requires an SMS provider integration — not connected" checked={d.smsEnabled} onChange={(v) => set('smsEnabled', v)} disabled />
                <SwitchRow label="Push" hint="Requires a push provider integration — not connected" checked={d.pushEnabled} onChange={(v) => set('pushEnabled', v)} disabled />
              </div>
            )}
          </SettingsGroup>
        )}

        {tab === 'social' && (
          <SettingsGroup title="Social" subtitle="Links shown in the footer and on the contact page" groupKey="social" value={s.social}>
            {(d, set) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Instagram" placeholder="https://instagram.com/yourshop" value={d.instagram} onChange={(ev) => set('instagram', ev.target.value)} />
                <Input label="YouTube" placeholder="https://youtube.com/@yourshop" value={d.youtube} onChange={(ev) => set('youtube', ev.target.value)} />
                <Input label="Facebook" placeholder="https://facebook.com/yourshop" value={d.facebook} onChange={(ev) => set('facebook', ev.target.value)} />
                <Input label="X / Twitter" placeholder="https://x.com/yourshop" value={d.twitter} onChange={(ev) => set('twitter', ev.target.value)} />
                <Input label="WhatsApp number" placeholder="+91 98765 43210" value={d.whatsapp} onChange={(ev) => set('whatsapp', ev.target.value)} />
              </div>
            )}
          </SettingsGroup>
        )}
      </div>
      {tab === 'audit' && <AuditLog />}
    </div>
  );
}
