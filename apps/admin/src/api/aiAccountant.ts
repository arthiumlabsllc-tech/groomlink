import apiClient from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountantChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AccountantChatResponse {
  reply: string;
  toolsUsed: string[];
}

export type AccountantPeriod = '7d' | '30d' | '90d' | 'ytd' | 'all';
export type AccountantReportType = 'pl' | 'full';

export interface FinancialReportResponse {
  report: string;
  metrics: unknown;
  period: AccountantPeriod;
  type: AccountantReportType;
  generatedAt: string;
}

export interface AccountantAlert {
  id: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  details: Record<string, unknown> | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolvedAt: string | null;
  createdAt: string;
}

export interface AccountantStatus {
  configured: boolean;
  model: string;
}

export interface AnomalyScanResponse {
  scannedAt: string;
  alertsCreated: number;
  alerts: Array<{ severity: string; title: string; message: string }>;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function getAccountantStatus(): Promise<AccountantStatus> {
  const response = await apiClient.get('/admin/ai-accountant/status');
  return response.data.data;
}

export async function chatWithAccountant(
  message: string,
  history: AccountantChatHistoryMessage[]
): Promise<AccountantChatResponse> {
  const response = await apiClient.post('/admin/ai-accountant/chat', { message, history }, { timeout: 120000 });
  return response.data.data;
}

export async function generateAccountantReport(
  period: AccountantPeriod,
  type: AccountantReportType
): Promise<FinancialReportResponse> {
  const response = await apiClient.post('/admin/ai-accountant/report', { period, type }, { timeout: 180000 });
  return response.data.data;
}

export async function getAccountantAlerts(status?: string): Promise<AccountantAlert[]> {
  const response = await apiClient.get('/admin/ai-accountant/alerts', { params: status ? { status } : {} });
  return response.data.data;
}

export async function updateAccountantAlert(
  id: string,
  status: 'RESOLVED' | 'DISMISSED'
): Promise<AccountantAlert> {
  const response = await apiClient.patch(`/admin/ai-accountant/alerts/${id}`, { status });
  return response.data.data;
}

export async function runAccountantScan(): Promise<AnomalyScanResponse> {
  const response = await apiClient.post('/admin/ai-accountant/alerts/scan', {}, { timeout: 120000 });
  return response.data.data;
}
