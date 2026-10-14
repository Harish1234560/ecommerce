import { errorMessage } from '@/api/client';
import { Card } from '@/components/admin/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, fieldErrors } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/Modal';
import { adminNotificationService, type AnnouncementInput } from '@/services/adminService';
import { toast } from '@/store/toast';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';

const blank: AnnouncementInput = { type: 'OFFER', title: '', message: '', link: '' };

// Sends an in-app notification to every active customer, e.g. a new sale or a store update.
export function Announcement() {
  const [form, setForm] = useState<AnnouncementInput>(blank);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = useMutation({
    mutationFn: () => adminNotificationService.broadcast(form),
    onSuccess: (r) => {
      toast.success(`Announcement sent to ${r.recipients} customer${r.recipients === 1 ? '' : 's'}`);
      setForm(blank);
      setErrors({});
      setConfirming(false);
    },
    onError: (err) => {
      setErrors(fieldErrors(err));
      setConfirming(false);
      toast.error(errorMessage(err));
    },
  });
  const ready = form.title.trim().length >= 3 && form.message.trim().length >= 5;

  return (
    <Card title="Send announcement" subtitle="An in-app notification for every active customer">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) setConfirming(true);
        }}
      >
        <Input label="Title" required maxLength={80} value={form.title} error={errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Weekend sale is live" />
        <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AnnouncementInput['type'] })}>
          <option value="OFFER">Offer</option>
          <option value="SYSTEM">Store update</option>
        </Select>
        <Textarea label="Message" required rows={3} maxLength={300} value={form.message} error={errors.message} onChange={(e) => setForm({ ...form, message: e.target.value })} wrapperClassName="md:col-span-2" />
        <Input label="Link (optional)" value={form.link} error={errors.link} hint="A page on this site, for example /offers" onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/offers" />
        <div className="flex items-end justify-end">
          <Button type="submit" size="sm" disabled={!ready} icon={<Send className="h-4 w-4" />}>Send to customers</Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Send this announcement?"
        message={`“${form.title}” will appear in the notifications of every active customer. This cannot be undone.`}
        confirmLabel="Send"
        loading={send.isPending}
        onConfirm={() => send.mutate()}
        onClose={() => setConfirming(false)}
      />
    </Card>
  );
}
