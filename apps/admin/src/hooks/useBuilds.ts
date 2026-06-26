import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEasBuilds, cancelEasBuild, EasBuild } from '../api/builds';

export function useEasBuilds(accountName: string, projectSlug: string, platform?: string) {
  return useQuery<EasBuild[], Error>({
    queryKey: ['eas-builds', accountName, projectSlug, platform],
    queryFn: () => fetchEasBuilds(accountName, projectSlug, platform),
    refetchInterval: 30_000, // auto-refresh every 30s
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });
}

export function useCancelBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (buildId: string) => cancelEasBuild(buildId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eas-builds'] });
    },
  });
}
