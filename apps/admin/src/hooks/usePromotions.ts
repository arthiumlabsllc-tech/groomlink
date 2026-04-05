import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi, CreateCouponData } from '../api';

const PROMOTIONS_KEY = 'promotions';

export function useCoupons(page: number = 1, limit: number = 20, active?: boolean) {
  return useQuery({
    queryKey: [PROMOTIONS_KEY, 'coupons', page, limit, active],
    queryFn: () => promotionsApi.getAll(page, limit, active),
    staleTime: 60 * 1000,
  });
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: [PROMOTIONS_KEY, 'coupon', id],
    queryFn: () => promotionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateCouponData) => promotionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROMOTIONS_KEY, 'coupons'] });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCouponData> }) => 
      promotionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROMOTIONS_KEY] });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => promotionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROMOTIONS_KEY, 'coupons'] });
    },
  });
}

export function useSendPushNotification() {
  return useMutation({
    mutationFn: ({ title, message, target }: { title: string; message: string; target?: 'all' | 'customers' | 'owners' }) => 
      promotionsApi.sendPushNotification(title, message, target),
  });
}
