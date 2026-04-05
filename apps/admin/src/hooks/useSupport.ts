import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../api';

const SUPPORT_KEY = 'support';

export function useTickets(page: number = 1, limit: number = 20, status?: string, priority?: string) {
  return useQuery({
    queryKey: [SUPPORT_KEY, 'tickets', page, limit, status, priority],
    queryFn: () => supportApi.getAll(page, limit, status, priority),
    staleTime: 30 * 1000,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: [SUPPORT_KEY, 'ticket', id],
    queryFn: () => supportApi.getById(id),
    enabled: !!id,
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      supportApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPORT_KEY, 'ticket', variables.id] });
      queryClient.invalidateQueries({ queryKey: [SUPPORT_KEY, 'tickets'] });
    },
  });
}

export function useSendTicketMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => 
      supportApi.sendMessage(id, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPORT_KEY, 'ticket', variables.id] });
    },
  });
}
