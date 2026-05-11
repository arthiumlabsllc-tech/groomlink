import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '../components/Icon';
import { formatDate } from '../lib/utils';
import { securityApi, SecurityEvent, Severity } from '../api/security';

const SEVERITY_STYLE: Record<Severity, string> = {
  LOW:      'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH:     'bg-red-100 text-red-700 border-red-300',
  CRITICAL: 'bg-red-700 text-white border-red-800',
};

const EVENT_TYPES = [
  'BRUTE_FORCE_LOGIN',
  'OTP_BOMB',
  'OTP_FAILURE_SPREE',
  'ROLE_ESCALATION',
  'ADMIN_CREATED',
  'ADMIN_DELETED',
  'SUSPICIOUS_REQUEST',
  'RATE_LIMIT_HIT',
  'AUTH_RATE_LIMIT_HIT',
  'PAYMENT_WEBHOOK_BAD_SIG',
  'UNAUTHORIZED_ADMIN_ACCESS',
  'IMPERSONATION_STARTED',
  'MAINTENANCE_TOGGLED',
  'PAYMENT_SETTINGS_CHANGED',
  'MANUAL',
];

export function Security() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [eventType, setEventType] = useState<string>('');
  const [resolvedFilter, setResolvedFilter] = useState<'' | 'false' | 'true'>('false');
  const [ip, setIp] = useState('');
  const [selected, setSelected] = useState<SecurityEvent | null>(null);

  const stats = useQuery({
    queryKey: ['security', 'stats'],
    queryFn: securityApi.getStats,
    refetchInterval: 30_000,
  });

  const list = useQuery({
    queryKey: ['security', 'events', { page, severity, eventType, resolvedFilter, ip }],
    queryFn: () =>
      securityApi.listEvents({
        page,
        pageSize: 50,
        severity: severity || undefined,
        eventType: eventType || undefined,
        resolved: resolvedFilter === '' ? undefined : resolvedFilter === 'true',
        ip: ip || undefined,
      }),
    refetchInterval: 30_000,
  });

  // Jump to event if URL contains ?event=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('event');
    if (id && list.data?.items) {
      const evt = list.data.items.find((e) => e.id === id);
      if (evt) setSelected(evt);
    }
  }, [list.data]);

  const totalPages = list.data?.pagination.totalPages || 1;
  const topTypes = useMemo(() => stats.data?.topEventTypes7d || [], [stats.data]);

  const resolve = async (id: string) => {
    await securityApi.resolve(id);
    queryClient.invalidateQueries({ queryKey: ['security'] });
    setSelected(null);
  };
  const reopen = async (id: string) => {
    await securityApi.reopen(id);
    queryClient.invalidateQueries({ queryKey: ['security'] });
    setSelected(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Icon name="shield" />
            Security Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live feed of suspected attacks and platform anomalies. HIGH and CRITICAL events also email admins.
          </p>
        </div>
        <button
          onClick={() => { stats.refetch(); list.refetch(); }}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-slate-200 hover:bg-slate-50"
        >
          <Icon name="refresh" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Events last 24h" value={stats.data?.last24h ?? '—'} />
        <StatCard label="Events last 7d"  value={stats.data?.last7d ?? '—'} />
        <StatCard label="Unresolved"      value={stats.data?.unresolved ?? '—'} highlight={(stats.data?.unresolved || 0) > 0} />
        <StatCard
          label="CRITICAL / HIGH (24h)"
          value={(stats.data?.bySeverity24h?.CRITICAL || 0) + (stats.data?.bySeverity24h?.HIGH || 0)}
          highlight={((stats.data?.bySeverity24h?.CRITICAL || 0) + (stats.data?.bySeverity24h?.HIGH || 0)) > 0}
        />
      </div>

      {/* Severity breakdown + top types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Severity (last 24h)</div>
          <div className="flex gap-2">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
              <div key={s} className={`flex-1 rounded-md border px-3 py-2 ${SEVERITY_STYLE[s]}`}>
                <div className="text-xs uppercase tracking-wide opacity-80">{s}</div>
                <div className="text-lg font-semibold">{stats.data?.bySeverity24h?.[s] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-700 mb-3">Top event types (7d)</div>
          {topTypes.length === 0 && <div className="text-sm text-slate-500">No events yet.</div>}
          <ul className="space-y-1 text-sm">
            {topTypes.map((t) => (
              <li key={t.eventType} className="flex justify-between">
                <span className="font-mono text-slate-700">{t.eventType}</span>
                <span className="text-slate-500">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Severity</label>
          <select value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value as Severity | ''); }}
            className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Event type</label>
          <select value={eventType} onChange={(e) => { setPage(1); setEventType(e.target.value); }}
            className="border border-slate-200 rounded-md px-2 py-1.5 text-sm min-w-[220px]">
            <option value="">All</option>
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select value={resolvedFilter} onChange={(e) => { setPage(1); setResolvedFilter(e.target.value as any); }}
            className="border border-slate-200 rounded-md px-2 py-1.5 text-sm">
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
            <option value="">All</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">IP</label>
          <input value={ip} onChange={(e) => setIp(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
            placeholder="e.g. 1.2.3.4"
            className="border border-slate-200 rounded-md px-2 py-1.5 text-sm" />
        </div>
      </div>

      {/* Events table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Time</th>
              <th className="text-left px-4 py-2">Severity</th>
              <th className="text-left px-4 py-2">Event</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">IP</th>
              <th className="text-left px-4 py-2">Endpoint</th>
              <th className="text-left px-4 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-500">Loading…</td></tr>
            )}
            {!list.isLoading && list.data?.items.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-500">No events match these filters.</td></tr>
            )}
            {list.data?.items.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelected(e)}>
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">{formatDate(e.createdAt)}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${SEVERITY_STYLE[e.severity]}`}>
                    {e.severity}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-slate-800">{e.eventType}</td>
                <td className="px-4 py-2 text-slate-600">{e.source}</td>
                <td className="px-4 py-2 font-mono text-slate-700">{e.ipAddress || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500 max-w-xs truncate">
                  {e.method ? `${e.method} ` : ''}{e.endpoint || '—'}
                </td>
                <td className="px-4 py-2">
                  {e.resolved
                    ? <span className="text-green-700 text-xs">Resolved</span>
                    : <span className="text-red-600 text-xs">Open</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  <button className="text-xs text-blue-600 hover:underline">Details →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100 text-sm">
            <div className="text-slate-500">
              Page {page} of {totalPages} · {list.data?.pagination.total} events
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Details drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${SEVERITY_STYLE[selected.severity]}`}>
                  {selected.severity}
                </div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 font-mono">{selected.eventType}</h2>
                <p className="text-sm text-slate-600 mt-1">{selected.message}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <Icon name="close" />
              </button>
            </div>

            <div className="p-5 space-y-2 text-sm">
              <KV k="Time"      v={formatDate(selected.createdAt)} />
              <KV k="Source"    v={selected.source} />
              <KV k="IP"        v={selected.ipAddress || '—'} mono />
              <KV k="User-Agent" v={selected.userAgent || '—'} />
              <KV k="Endpoint"  v={`${selected.method || ''} ${selected.endpoint || '—'}`} mono />
              <KV k="User"      v={selected.userEmail || selected.userId || '—'} />
              <KV k="Status"    v={selected.resolved ? `Resolved ${selected.resolvedAt ? `at ${formatDate(selected.resolvedAt)}` : ''}` : 'Open'} />
              {selected.details && (
                <div className="mt-3">
                  <div className="text-xs uppercase text-slate-500 mb-1">Details</div>
                  <pre className="bg-slate-900 text-slate-100 text-xs p-3 rounded overflow-auto">
{JSON.stringify(selected.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              {selected.resolved
                ? <button onClick={() => reopen(selected.id)}
                    className="px-4 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50">Reopen</button>
                : <button onClick={() => resolve(selected.id)}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">Mark resolved</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${highlight ? 'text-red-700' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 text-xs text-slate-500 uppercase tracking-wide pt-0.5">{k}</div>
      <div className={`flex-1 text-sm text-slate-800 ${mono ? 'font-mono break-all' : ''}`}>{v}</div>
    </div>
  );
}

export default Security;
