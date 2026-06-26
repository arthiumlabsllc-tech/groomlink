import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackAPI } from '../api/feedback';

const FEEDBACK_KEY = 'feedback';

export function useFeedbackList(params?: {
  page?: number;
  limit?: number;
  status?: string;
  userType?: string;
  rating?: number;
}) {
  return useQuery({
    queryKey: [FEEDBACK_KEY, 'list', params],
    queryFn: () => feedbackAPI.getFeedback(params),
    staleTime: 60 * 1000,
  });
}

export function useFeedbackStats() {
  return useQuery({
    queryKey: [FEEDBACK_KEY, 'stats'],
    queryFn: () => feedbackAPI.getStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      feedbackAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FEEDBACK_KEY] });
    },
  });
}
