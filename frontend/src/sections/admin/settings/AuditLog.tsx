import { Card } from '@/components/admin/Card';
import { PageSpinner } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { adminSettingsService } from '@/services/adminService';
import { type AuditLogEntry } from '@/types/admin';
import { formatDateTime } from '@/utils/format';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function AuditLog() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'settings', 'audit', page], queryFn: () => adminSettingsService.auditLogs({ page, limit: 15 }), placeholderData: keepPreviousData });
  const describe = (m: AuditLogEntry['meta']) => {
    if (!m) return '';
    const bits = [m.name, m.orderNumber, m.code, m.email, m.title, m.product].filter((v): v is string => typeof v === 'string');
    if (typeof m.from === 'string' && typeof m.to === 'string') bits.push(`${m.from} → ${m.to}`);
    return bits.join(' · ');
  };
  return (
    <Card title="Admin audit log" subtitle="A record of important admin actions" padded={false}>
      {isLoading ? <PageSpinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="px-4 py-2.5">When</th><th>Admin</th><th>Action</th><th>Entity</th><th className="pr-4">Details</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data?.data.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{formatDateTime(l.createdAt)}</td>
                  <td className="text-slate-800">{l.admin.name}</td>
                  <td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{l.action}</code></td>
                  <td className="text-slate-600">{l.entity}</td>
                  <td className="max-w-[260px] truncate pr-4 text-slate-500">{describe(l.meta)}</td>
                </tr>
              ))}
              {data?.data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No admin actions recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && data.meta.pages > 1 && <div className="border-t border-slate-100 p-3"><Pagination page={page} pages={data.meta.pages} onChange={setPage} /></div>}
    </Card>
  );
}
