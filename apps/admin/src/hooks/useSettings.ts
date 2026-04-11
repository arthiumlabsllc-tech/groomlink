import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, SiteSettings, MaintenanceSettings, AdminSystemHealth } from '../api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SiteSettings>) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useToggleMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MaintenanceSettings) => settingsApi.toggleMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useHealth(refetchInterval: number = 30000) {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => settingsApi.getHealth(),
    refetchInterval,
  });
}
