import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import Icon from '../components/Icon';
import { formatDate } from '../lib/utils';
import {
  getAccountantStatus,
  chatWithAccountant,
  generateAccountantReport,
  getAccountantAlerts,
  updateAccountantAlert,
  runAccountantScan,
  type AccountantChatHistoryMessage,
  type AccountantPeriod,
  type AccountantReportType,
  type FinancialReportResponse,
  type AccountantAlert,
} from '../api/aiAccountant';

type Tab = 'chat' | 'reports' | 'alerts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  error?: boolean;
}

const SUGGESTED_PROMPTS = [
  'What was our revenue last month?',
  'Summarize the escrow health — anything stuck?',
  'Why did refunds spike recently?',
  'Which payment gateway has the highest failure rate?',
  'What are our top 5 salons by revenue this quarter?',
  'How much do we owe salons in pending payouts?',
];

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
  return axiosError?.response?.data?.error?.message || fallback;
}

// Markdown styling shared between chat replies and reports
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-bold mt-4 mb-2 text-gray-800">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-bold mt-4 mb-2 text-gray-800">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mt-3 mb-1.5 text-gray-800">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 leading-relaxed">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-gray-200 px-3 py-1.5 text-left font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-gray-200 px-3 py-1.5 text-gray-600">{children}</td>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-gray-100 rounded px-1 py-0.5 text-sm">{children}</code>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  hr: () => <hr className="my-4 border-gray-200" />,
};

// ---------------------------------------------------------------------------
// Chat tab
// ---------------------------------------------------------------------------

function ChatTab({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const history: AccountantChatHistoryMessage[] = messages
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setIsSending(true);

    try {
      const result = await chatWithAccountant(trimmed, history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.reply, toolsUsed: result.toolsUsed },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: getApiErrorMessage(error, 'Sorry, I could not process that request. Please try again.'),
          error: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card-v2 flex flex-col h-[70vh] overflow-hidden">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#006B3F] to-[#006B3F]/70 rounded-2xl flex items-center justify-center">
              <Icon name="calculate" size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Ask your AI Accountant</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                I analyze live payments, escrow, fees, refunds, payouts, subscriptions and sponsorships.
                Try one of the questions below.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={!configured || isSending}
                  className="px-3 py-1.5 text-sm rounded-full border border-gray-200 text-gray-600 hover:bg-[#006B3F]/5 hover:border-[#006B3F]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                message.role === 'user'
                  ? 'bg-[#006B3F] text-white rounded-br-sm'
                  : message.error
                    ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm'
                    : 'bg-gray-50 text-gray-700 border border-gray-100 rounded-bl-sm'
              }`}
            >
              {message.role === 'assistant' && !message.error ? (
                <div className="markdown-body">
                  <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              {message.toolsUsed && message.toolsUsed.length > 0 && (
                <p className="mt-2 text-xs opacity-60">
                  Data sources: {Array.from(new Set(message.toolsUsed)).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-[#006B3F] rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-[#006B3F] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#006B3F] rounded-full animate-bounce [animation-delay:300ms]" />
                <span className="ml-1">Analyzing platform data...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={configured ? 'Ask about revenue, refunds, escrow, payouts...' : 'AI Accountant is not configured yet'}
            disabled={!configured || isSending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!configured || isSending || !input.trim()}
            className="px-5 py-2.5 bg-[#006B3F] text-white rounded-xl text-sm font-medium hover:bg-[#006B3F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="send" size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports tab
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: Array<{ value: AccountantPeriod; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

function ReportsTab({ configured }: { configured: boolean }) {
  const [period, setPeriod] = useState<AccountantPeriod>('30d');
  const [type, setType] = useState<AccountantReportType>('full');
  const [report, setReport] = useState<FinancialReportResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateAccountantReport(period, type);
      setReport(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Report generation failed. Please try again.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groomlink-${type === 'pl' ? 'pnl' : 'financial-health'}-${report.period}-${report.generatedAt.split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card-v2 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reporting period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as AccountantPeriod)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Report type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountantReportType)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B3F]/30 focus:border-[#006B3F]"
            >
              <option value="full">Full financial health report</option>
              <option value="pl">Profit & Loss summary</option>
            </select>
          </div>
          <button
            onClick={generate}
            disabled={!configured || isGenerating}
            className="px-6 py-2.5 bg-[#006B3F] text-white rounded-xl text-sm font-medium hover:bg-[#006B3F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Icon name="summarize" size={16} />
                Generate report
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <Icon name="error" size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Report output */}
      {report && (
        <div className="card-v2 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm sm:text-base">
                {type === 'pl' ? 'Profit & Loss Summary' : 'Financial Health Report'} — {PERIOD_OPTIONS.find((o) => o.value === report.period)?.label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Generated {formatDate(report.generatedAt)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyReport}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={14} />
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadReport}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Icon name="download" size={14} />
                Download
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-6 text-sm text-gray-700">
            <ReactMarkdown components={markdownComponents}>{report.report}</ReactMarkdown>
          </div>
        </div>
      )}

      {!report && !isGenerating && !error && (
        <div className="card-v2 p-12 flex flex-col items-center justify-center text-center">
          <Icon name="summarize" size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No report generated yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            Choose a period and report type above, then click Generate. The AI Accountant compiles live
            platform figures into an accountant-grade markdown report.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alerts tab
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  LOW: { badge: 'bg-gray-100 text-gray-700', border: 'border-l-gray-400' },
  MEDIUM: { badge: 'bg-blue-100 text-blue-800', border: 'border-l-blue-500' },
  HIGH: { badge: 'bg-orange-100 text-orange-800', border: 'border-l-orange-500' },
  CRITICAL: { badge: 'bg-red-100 text-red-800', border: 'border-l-red-600' },
};

function AlertsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['accountant-alerts', statusFilter],
    queryFn: () => getAccountantAlerts(statusFilter || undefined),
  });

  const scanMutation = useMutation({
    mutationFn: runAccountantScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountant-alerts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'RESOLVED' | 'DISMISSED' }) =>
      updateAccountantAlert(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountant-alerts'] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['OPEN', 'RESOLVED', 'DISMISSED', ''].map((status) => (
            <button
              key={status || 'all'}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                statusFilter === status
                  ? 'bg-[#006B3F] text-white border-[#006B3F]'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status === '' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="px-4 py-2 bg-[#CE1126] text-white rounded-xl text-sm font-medium hover:bg-[#CE1126]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {scanMutation.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Icon name="monitoring" size={16} />
              Run scan now
            </>
          )}
        </button>
      </div>

      {scanMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <Icon name="check_circle" size={16} />
          Scan completed — {scanMutation.data.alertsCreated} new alert(s) created. Scans also run automatically every day at 06:00 GMT.
        </div>
      )}
      {scanMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <Icon name="error" size={16} />
          {getApiErrorMessage(scanMutation.error, 'Scan failed. Please try again.')}
        </div>
      )}

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-v2 p-4">
              <div className="skeleton-shimmer h-5 w-64 mb-2" />
              <div className="skeleton-shimmer h-4 w-full" />
            </div>
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <div className="card-v2 p-12 flex flex-col items-center justify-center text-center">
          <Icon name="verified" size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No alerts here</p>
          <p className="text-sm text-gray-500 mt-1">
            {statusFilter === 'OPEN'
              ? 'No open anomalies detected. The daily scan checks refunds, escrows, payment failures and payout backlogs.'
              : 'Nothing recorded with this status yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onUpdate={(status) => updateMutation.mutate({ id: alert.id, status })}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onUpdate,
  isUpdating,
}: {
  alert: AccountantAlert;
  onUpdate: (status: 'RESOLVED' | 'DISMISSED') => void;
  isUpdating: boolean;
}) {
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.LOW;
  const typeLabels: Record<string, string> = {
    refund_spike: 'Refund spike',
    stuck_escrow: 'Stuck escrow',
    payment_failure_rate: 'Payment failures',
    stuck_payment: 'Stuck payment',
    payout_backlog: 'Payout backlog',
  };

  return (
    <div className={`card-v2 p-4 sm:p-5 border-l-4 ${style.border}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
              {alert.severity}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {typeLabels[alert.alertType] || alert.alertType}
            </span>
            <span className="text-xs text-gray-400">{formatDate(alert.createdAt)}</span>
          </div>
          <h4 className="font-semibold text-gray-800">{alert.title}</h4>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{alert.message}</p>
        </div>
        {alert.status === 'OPEN' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onUpdate('RESOLVED')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#006B3F] text-white hover:bg-[#006B3F]/90 transition-colors disabled:opacity-50"
            >
              Resolve
            </button>
            <button
              onClick={() => onUpdate('DISMISSED')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AiAccountant() {
  const [tab, setTab] = useState<Tab>('chat');

  const { data: status } = useQuery({
    queryKey: ['accountant-status'],
    queryFn: getAccountantStatus,
    staleTime: 10 * 60 * 1000,
  });

  const configured = status?.configured !== false;

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'reports', label: 'Reports', icon: 'summarize' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications_active' },
  ];

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Icon name="calculate" size={26} className="text-[#006B3F]" />
            AI Accountant
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Professional accounting insights over live platform financial data
          </p>
        </div>
      </div>

      {/* Not configured banner */}
      {status && !status.configured && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-start gap-3">
          <Icon name="warning" size={20} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 text-sm">AI Accountant is not configured</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              Set the <code className="bg-yellow-100 px-1 rounded">OPENAI_API_KEY</code> environment variable
              on the API server to enable chat and report generation. Anomaly alerts continue to work without it.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-[#006B3F] text-[#006B3F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon name={t.icon} size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'chat' && <ChatTab configured={configured} />}
      {tab === 'reports' && <ReportsTab configured={configured} />}
      {tab === 'alerts' && <AlertsTab />}
    </div>
  );
}

export default AiAccountant;
