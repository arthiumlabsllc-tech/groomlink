import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, UpdatePlanData, CreatePlanData, AssignPlanData } from '../api/subscription';

const SUBSCRIPTION_KEY = 'subscriptions';
const PLAN_KEY = 'subscriptionPlans';
const INVOICE_KEY = 'subscriptionInvoices';

// Overview stats
export function useSubscriptionOverview() {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'overview'],
    queryFn: () => subscriptionApi.getOverview(),
    staleTime: 60 * 1000,
  });
}

// All subscriptions
export function useSubscriptions(page: number = 1, limit: number = 20, status?: string) {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'list', page, limit, status],
    queryFn: () => subscriptionApi.getAll(page, limit, status),
    staleTime: 60 * 1000,
  });
}

// Subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: [PLAN_KEY],
    queryFn: () => subscriptionApi.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
}

// Recent subscriptions
export function useRecentSubscriptions() {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'recent'],
    queryFn: () => subscriptionApi.getRecent(),
    staleTime: 60 * 1000,
  });
}

// Expiring soon
export function useExpiringSoonSubscriptions() {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'expiring-soon'],
    queryFn: () => subscriptionApi.getExpiringSoon(),
    staleTime: 60 * 1000,
  });
}

// Invoices
export function useInvoices(
  page: number = 1,
  limit: number = 20,
  status?: string,
  startDate?: string,
  endDate?: string,
  planSlug?: string
) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'list', page, limit, status, startDate, endDate, planSlug],
    queryFn: () => subscriptionApi.getInvoices(page, limit, status, startDate, endDate, planSlug),
    staleTime: 60 * 1000,
  });
}

// Salon subscription
export function useSalonSubscription(salonId: string) {
  return useQuery({
    queryKey: [SUBSCRIPTION_KEY, 'salon', salonId],
    queryFn: () => subscriptionApi.getSalonSubscription(salonId),
    enabled: !!salonId,
  });
}

// Salon invoices
export function useSalonInvoices(salonId: string) {
  return useQuery({
    queryKey: [INVOICE_KEY, 'salon', salonId],
    queryFn: () => subscriptionApi.getSalonInvoices(salonId),
    enabled: !!salonId,
  });
}

// Mutations
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: UpdatePlanData }) =>
      subscriptionApi.updatePlan(planId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY] });
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanData) => subscriptionApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLAN_KEY] });
    },
  });
}

export function useAssignPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignPlanData) => subscriptionApi.assignPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY] });
    },
  });
}

export function useExtendSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ salonId, days }: { salonId: string; days: number }) =>
      subscriptionApi.extendSubscription(salonId, days),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTION_KEY, 'salon', variables.salonId] });
    },
  });
}
