import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportStaffApi, CreateSupportStaffData } from '../api';

export function useSupportStaff(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['supportStaff', page, limit],
    queryFn: () => supportStaffApi.getAll(page, limit),
  });
}

export function useCreateSupportStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateSupportStaffData) => supportStaffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportStaff'] });
    },
  });
}
