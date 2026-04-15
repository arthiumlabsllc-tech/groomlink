import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi, escrowApi, cancellationsApi, noShowsApi } from '../api';

// ============ Policies ============

const POLICIES_KEY = 'policies';

export function usePolicies() {
  return useQuery({
    queryKey: [POLICIES_KEY, 'list'],
    queryFn: () => policiesApi.getAll(),
    staleTime: 60 * 1000,
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, policyValue }: { id: string; policyValue: string }) =>
      policiesApi.update(id, policyValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POLICIES_KEY] });
    },
  });
}

// ============ Escrow ============

const ESCROW_KEY = 'escrow';

export function useEscrow(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [ESCROW_KEY, 'list', page, limit],
    queryFn: () => escrowApi.getAll(page, limit),
    staleTime: 60 * 1000,
  });
}

// ============ Cancellations ============

const CANCELLATIONS_KEY = 'cancellations';

export function useCancellations(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [CANCELLATIONS_KEY, 'list', page, limit],
    queryFn: () => cancellationsApi.getAll(page, limit),
    staleTime: 60 * 1000,
  });
}

// ============ No-Shows ============

const NO_SHOWS_KEY = 'noShows';

export function useNoShows(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [NO_SHOWS_KEY, 'list', page, limit],
    queryFn: () => noShowsApi.getAll(page, limit),
    staleTime: 60 * 1000,
  });
}

export function useResolveNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution, upheld }: { id: string; resolution: string; upheld: boolean }) =>
      noShowsApi.resolve(id, resolution, upheld),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NO_SHOWS_KEY] });
    },
  });
}
