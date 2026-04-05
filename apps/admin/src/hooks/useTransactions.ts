import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api';

const TRANSACTIONS_KEY = 'transactions';

export function useTransactions(page: number = 1, limit: number = 20, status?: string) {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, 'list', page, limit, status],
    queryFn: () => transactionsApi.getAll(page, limit, status),
    staleTime: 60 * 1000,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, 'detail', id],
    queryFn: () => transactionsApi.getById(id),
    enabled: !!id,
  });
}

export function useRefundTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      transactionsApi.refund(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
    },
  });
}

export function useTransactionStats(period: string = '30d') {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, 'stats', period],
    queryFn: () => transactionsApi.getStats(period),
    staleTime: 5 * 60 * 1000,
  });
}
