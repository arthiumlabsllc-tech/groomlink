import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sponsoredSalonsApi, CreateSponsoredSalonData } from '../api/sponsoredSalons';

const SPONSORED_SALONS_KEY = 'sponsored-salons';
const SPONSORSHIP_PACKAGES_KEY = 'sponsorship-packages';
const SALON_SEARCH_KEY = 'salon-search';

export function useSponsoredSalons(page: number = 1, limit: number = 20, status?: 'active' | 'expired') {
  return useQuery({
    queryKey: [SPONSORED_SALONS_KEY, 'list', page, limit, status],
    queryFn: () => sponsoredSalonsApi.getAll(page, limit, status),
    staleTime: 60 * 1000,
  });
}

export function useActiveSponsoredSalons(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [SPONSORED_SALONS_KEY, 'active', page, limit],
    queryFn: () => sponsoredSalonsApi.getActive(page, limit),
    staleTime: 60 * 1000,
  });
}

export function useSponsorshipPackages() {
  return useQuery({
    queryKey: [SPONSORSHIP_PACKAGES_KEY],
    queryFn: () => sponsoredSalonsApi.getPackages(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes as packages rarely change
  });
}

export function useSalonSearch(query: string) {
  return useQuery({
    queryKey: [SALON_SEARCH_KEY, query],
    queryFn: () => sponsoredSalonsApi.searchSalons(query),
    enabled: query.length >= 2, // Only search when query is at least 2 characters
    staleTime: 30 * 1000,
  });
}

export function useCreateSponsoredSalon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSponsoredSalonData) => sponsoredSalonsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPONSORED_SALONS_KEY] });
    },
  });
}

export function useRemoveSponsoredSalon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sponsoredSalonsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SPONSORED_SALONS_KEY] });
    },
  });
}
