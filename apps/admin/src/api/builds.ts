import axios from 'axios';

const EAS_API_BASE = 'https://api.expo.dev/v2';

export interface EasBuild {
  id: string;
  status: string;
  platform: string;
  appVersion: string;
  appBuildVersion: string;
  sdkVersion: string;
  releaseChannel: string;
  buildProfile: string;
  gitCommitHash: string;
  gitCommitMessage: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expirationDate: string | null;
  logUrl: string | null;
  artifacts: {
    buildUrl?: string;
    logsUrl?: string;
  } | null;
  error: {
    message: string;
    errorCode: string;
  } | null;
}

export interface EasProject {
  id: string;
  name: string;
  slug: string;
  accountName: string;
}

export const EAS_PROJECTS: EasProject[] = [
  { id: 'customer-android', name: 'Customer App (Android)', slug: 'groomlink-customer', accountName: 'gr3enink' },
  { id: 'customer-ios', name: 'Customer App (iOS)', slug: 'groomlink-customer', accountName: 'gr3enink' },
  { id: 'partners-android', name: 'Partners App (Android)', slug: 'groomlink-partners', accountName: 'gr3enink' },
  { id: 'partners-ios', name: 'Partners App (iOS)', slug: 'groomlink-partners', accountName: 'gr3enink' },
];

const EAS_TOKEN_KEY = 'eas_access_token';

export function getEasToken(): string | null {
  return localStorage.getItem(EAS_TOKEN_KEY);
}

export function setEasToken(token: string): void {
  localStorage.setItem(EAS_TOKEN_KEY, token);
}

export function removeEasToken(): void {
  localStorage.removeItem(EAS_TOKEN_KEY);
}

function easHeaders() {
  const token = getEasToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchEasBuilds(
  accountName: string,
  projectSlug: string,
  platform?: string,
  limit: number = 10
): Promise<EasBuild[]> {
  const params: Record<string, string | number> = { limit };
  if (platform) params.platform = platform;

  const { data } = await axios.get(
    `${EAS_API_BASE}/accounts/${accountName}/projects/${projectSlug}/builds`,
    { headers: easHeaders(), params }
  );
  return data.builds || [];
}

export async function fetchEasBuild(buildId: string): Promise<EasBuild> {
  const { data } = await axios.get(`${EAS_API_BASE}/builds/${buildId}`, {
    headers: easHeaders(),
  });
  return data.build || data;
}

export async function cancelEasBuild(buildId: string): Promise<void> {
  await axios.post(`${EAS_API_BASE}/builds/${buildId}/cancel`, {}, {
    headers: easHeaders(),
  });
}
