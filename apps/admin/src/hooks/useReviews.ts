import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api';

const REVIEWS_KEY = 'reviews';

export function useReviews(page: number = 1, limit: number = 20, rating?: string) {
  return useQuery({
    queryKey: [REVIEWS_KEY, 'list', page, limit, rating],
    queryFn: () => reviewsApi.getAll({ page, limit, rating: rating || undefined }),
    staleTime: 60 * 1000,
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REVIEWS_KEY] });
    },
  });
}
