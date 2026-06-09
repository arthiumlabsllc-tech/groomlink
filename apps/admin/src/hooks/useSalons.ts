import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salonsApi, CreateSalonData } from '../api';

const SALONS_KEY = 'salons';
const KYC_KEY = 'kyc';

export function useSalons(page: number = 1, limit: number = 20, status?: string) {
  return useQuery({
    queryKey: [SALONS_KEY, 'list', page, limit, status],
    queryFn: () => salonsApi.getAll(page, limit, status),
    staleTime: 60 * 1000,
  });
}

export function usePendingSalons(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [SALONS_KEY, 'pending', page, limit],
    queryFn: () => salonsApi.getPending(page, limit),
    staleTime: 30 * 1000,
  });
}

export function useSalon(id: string) {
  return useQuery({
    queryKey: [SALONS_KEY, 'detail', id],
    queryFn: () => salonsApi.getById(id),
    enabled: !!id,
  });
}

export function useApproveSalon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => salonsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useRejectSalon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      salonsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useSuspendSalon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      salonsApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useReactivateSalon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => salonsApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useToggleFeaturedSalon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => salonsApi.toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useCreateSalon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateSalonData) => salonsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useSalonDetails(id: string) {
  return useQuery({
    queryKey: [SALONS_KEY, 'details', id],
    queryFn: () => salonsApi.getDetails(id),
    enabled: !!id,
  });
}

// KYC Hooks
export function useKycSubmissions(status?: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [KYC_KEY, 'list', status, page, limit],
    queryFn: () => salonsApi.getKycSubmissions(status, page, limit),
    staleTime: 30 * 1000,
  });
}

export function usePendingKycCount() {
  return useQuery({
    queryKey: [KYC_KEY, 'pending-count'],
    queryFn: async () => {
      const response = await salonsApi.getKycSubmissions('PENDING', 1, 1);
      return response.pagination.total;
    },
    staleTime: 30 * 1000,
  });
}

export function useKycSubmissionDetail(id: string) {
  return useQuery({
    queryKey: [KYC_KEY, 'detail', id],
    queryFn: () => salonsApi.getKycSubmissionDetail(id),
    enabled: !!id,
  });
}

export function useApproveKyc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => salonsApi.approveKyc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KYC_KEY] });
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}

export function useRejectKyc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      salonsApi.rejectKyc(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KYC_KEY] });
      queryClient.invalidateQueries({ queryKey: [SALONS_KEY] });
    },
  });
}
