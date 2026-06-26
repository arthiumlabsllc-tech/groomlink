import { useState } from 'react';
import Icon from '../components/Icon';
import { useEasBuilds, useCancelBuild } from '../hooks/useBuilds';
import {
  EasBuild,
  getEasToken,
  setEasToken,
  removeEasToken,
} from '../api/builds';

/* ── status helpers ─────────────────────────────────────── */

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  'finished':       { bg: 'bg-green-100',  text: 'text-green-800',  icon: 'check_circle', label: 'Finished' },
  'errored':        { bg: 'bg-red-100',    text: 'text-red-800',    icon: 'error',        label: 'Errored' },
  'canceled':       { bg: 'bg-gray-100',   text: 'text-gray-800',   icon: 'cancel',       label: 'Canceled' },
  'in-queue':       { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'hourglass_empty', label: 'In Queue' },
  'in-progress':    { bg: 'bg-blue-100',   text: 'text-blue-800',   icon: 'sync',         label: 'In Progress' },
  'pending-cancel': { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'do_not_disturb', label: 'Canceling' },
  'new':            { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: 'fiber_new',    label: 'New' },
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'help', label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon name={cfg.icon} size={14} />
      {cfg.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const isIOS = platform === 'IOS';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${isIOS ? 'bg-gray-900 text-white' : 'bg-green-100 text-green-800'}`}>
      <Icon name={isIOS ? 'phone_iphone' : 'android'} size={14} />
      {isIOS ? 'iOS' : 'Android'}
    </span>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function duration(start: string, end: string | null) {
  if (!end) return 'running…';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/* ── build card ─────────────────────────────────────────── */

function BuildCard({ build, onCancel }: { build: EasBuild; onCancel: (id: string) => void }) {
  const buildUrl = `https://expo.dev/accounts/gr3enink/projects/${build.platform === 'IOS' ? 'groomlink-customer' : 'groomlink-partners'}/builds/${build.id}`;
  const isRunning = build.status === 'in-progress' || build.status === 'in-queue' || build.status === 'new';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={build.platform} />
          <StatusChip status={build.status} />
          <span className="text-xs text-gray-500 font-mono">{build.id.slice(0, 8)}…</span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={() => onCancel(build.id)}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
            >
              <Icon name="stop_circle" size={14} /> Cancel
            </button>
          )}
          <a
            href={`https://expo.dev/accounts/gr3enink/projects/groomlink-${build.platform === 'IOS' ? 'customer' : 'partners'}/builds/${build.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#006B3F] hover:underline font-medium flex items-center gap-1"
          >
            <Icon name="open_in_new" size={14} /> View
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Version</p>
          <p className="font-medium">{build.appVersion || '—'} <span className="text-gray-400">({build.appBuildVersion || '—'})</span></p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Profile</p>
          <p className="font-medium capitalize">{build.buildProfile || '—'}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Started</p>
          <p className="font-medium">{timeAgo(build.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Duration</p>
          <p className="font-medium">{duration(build.createdAt, build.completedAt)}</p>
        </div>
      </div>

      {build.gitCommitMessage && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Icon name="commit" size={12} />
            <span className="font-mono text-gray-400">{build.gitCommitHash?.slice(0, 7)}</span>
            <span className="truncate">{build.gitCommitMessage}</span>
          </p>
        </div>
      )}

      {build.error?.message && (
        <div className="mt-3 pt-3 border-t border-red-100">
          <p className="text-xs text-red-600 flex items-start gap-1">
            <Icon name="error_outline" size={14} />
            <span>{build.error.message}</span>
          </p>
        </div>
      )}

      {build.artifacts?.buildUrl && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <a
            href={build.artifacts.buildUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#006B3F] hover:underline font-medium flex items-center gap-1"
          >
            <Icon name="download" size={14} /> Download Build Artifact
          </a>
        </div>
      )}
    </div>
  );
}

/* ── project section ────────────────────────────────────── */

function ProjectSection({
  title,
  slug,
  accountName,
  platform,
}: {
  title: string;
  slug: string;
  accountName: string;
  platform: string;
}) {
  const { data: builds, isLoading, error, refetch, isRefetching } = useEasBuilds(accountName, slug, platform);
  const cancelBuild = useCancelBuild();

  const handleCancel = (buildId: string) => {
    if (confirm('Cancel this build? This cannot be undone.')) {
      cancelBuild.mutate(buildId);
    }
  };

  const activeCount = builds?.filter(b => ['in-progress', 'in-queue', 'new'].includes(b.status)).length || 0;
  const lastFinished = builds?.find(b => b.status === 'finished');

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold animate-pulse">
              <Icon name="sync" size={12} /> {activeCount} active
            </span>
          )}
          {lastFinished && (
            <span className="text-xs text-gray-400">
              Last success: {timeAgo(lastFinished.completedAt || lastFinished.createdAt)}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="text-sm text-[#006B3F] hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          <Icon name={isRefetching ? 'hourglass_top' : 'refresh'} size={16} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Icon name="hourglass_empty" size={24} className="animate-spin mr-2" />
          Loading builds…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <div className="flex items-center gap-2 font-medium mb-1">
            <Icon name="error" size={16} /> Failed to load builds
          </div>
          <p>{(error as Error).message}</p>
          <p className="mt-2 text-xs text-red-500">Check your EAS access token in Settings above.</p>
        </div>
      )}

      {builds && builds.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Icon name="inbox" size={32} />
          <p className="mt-2 text-sm">No builds found</p>
        </div>
      )}

      {builds && builds.length > 0 && (
        <div className="space-y-3">
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── token settings panel ───────────────────────────────── */

function TokenSettings({ onTokenChange }: { onTokenChange: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState(getEasToken() || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (token.trim()) {
      setEasToken(token.trim());
    } else {
      removeEasToken();
    }
    setSaved(true);
    onTokenChange();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={16} />
        EAS Token Settings
        {getEasToken() && <span className="ml-1 text-green-600 text-xs">● configured</span>}
      </button>
      {isOpen && (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-3">
            EAS API requires an access token. Generate one at{' '}
            <a href="https://expo.dev/settings/access-tokens" target="_blank" rel="noopener noreferrer" className="text-[#006B3F] hover:underline">
              expo.dev/settings/access-tokens
            </a>
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your EAS access token…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#006B3F] text-white rounded-lg text-sm font-medium hover:bg-[#005a35] transition-colors"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
            {getEasToken() && (
              <button
                onClick={() => { removeEasToken(); setToken(''); onTokenChange(); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── quick links (no-token fallback) ────────────────────── */

function QuickLinks() {
  const projects = [
    { name: 'Customer App', url: 'https://expo.dev/accounts/gr3enink/projects/groomlink-customer/builds' },
    { name: 'Partners App', url: 'https://expo.dev/accounts/gr3enink/projects/groomlink-partners/builds' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {projects.map((p) => (
        <a
          key={p.name}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-[#006B3F]/30 transition-all"
        >
          <div className="w-12 h-12 bg-[#006B3F]/10 rounded-xl flex items-center justify-center">
            <Icon name="open_in_new" size={24} className="text-[#006B3F]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{p.name}</p>
            <p className="text-sm text-gray-500">View builds on expo.dev</p>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ── main page ──────────────────────────────────────────── */

export function Builds() {
  const [tokenKey, setTokenKey] = useState(0);
  const hasToken = !!getEasToken();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Icon name="build" size={28} className="text-[#006B3F]" />
          <h1 className="text-2xl font-bold text-gray-900">EAS Build Status</h1>
        </div>
        <p className="text-sm text-gray-500">Monitor and manage EAS builds for GroomLink mobile apps</p>
      </div>

      {/* Token Settings */}
      <TokenSettings onTokenChange={() => setTokenKey((k) => k + 1)} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Customer Android</p>
          <p className="text-sm font-medium text-gray-900">v2.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Cache: v22-lockfile-fix</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Customer iOS</p>
          <p className="text-sm font-medium text-gray-900">v2.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Cache: v22-lockfile-fix</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Partners Android</p>
          <p className="text-sm font-medium text-gray-900">v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Cache: v17-lockfile-fix</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Partners iOS</p>
          <p className="text-sm font-medium text-gray-900">v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Cache: v17-lockfile-fix</p>
        </div>
      </div>

      {/* Build Lists */}
      {!hasToken ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <Icon name="key" size={32} className="text-yellow-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-yellow-800 mb-1">EAS Access Token Required</p>
          <p className="text-xs text-yellow-600 mb-4">
            Configure your EAS access token above to view live build status, or use the quick links below.
          </p>
          <QuickLinks />
        </div>
      ) : (
        <div key={tokenKey}>
          <ProjectSection title="Customer App — Android" slug="groomlink-customer" accountName="gr3enink" platform="ANDROID" />
          <ProjectSection title="Customer App — iOS" slug="groomlink-customer" accountName="gr3enink" platform="IOS" />
          <ProjectSection title="Partners App — Android" slug="groomlink-partners" accountName="gr3enink" platform="ANDROID" />
          <ProjectSection title="Partners App — iOS" slug="groomlink-partners" accountName="gr3enink" platform="IOS" />
        </div>
      )}
    </div>
  );
}
