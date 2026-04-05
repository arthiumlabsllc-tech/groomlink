import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api';

const USERS_KEY = 'users';

export function useUsers(page: number = 1, limit: number = 20, role?: string, status?: string) {
  return useQuery({
    queryKey: [USERS_KEY, 'list', page, limit, role, status],
    queryFn: () => usersApi.getAll(page, limit, role, status),
    staleTime: 60 * 1000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [USERS_KEY, 'detail', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      usersApi.block(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => usersApi.unblock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] });
    },
  });
}
