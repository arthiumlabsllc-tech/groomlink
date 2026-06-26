import apiClient from './client';
import { Salon } from '../types';

export interface FavoritesListResponse {
  salons: Salon[];
  total: number;
}

export const favoritesApi = {
  /** List user's favorite salons */
  getFavorites: async (page = 1, limit = 50): Promise<FavoritesListResponse> => {
    const response = await apiClient.get(`/users/favorites?page=${page}&limit=${limit}`);
    const data = response.data.data ?? response.data;
    const rawItems: any[] = Array.isArray(data)
      ? data
      : data?.salons ?? data?.favorites ?? [];

    // The API returns Favorite records with a nested `salon` object.
    // Extract the salon so the screen receives proper Salon objects.
    const salons: Salon[] = rawItems.map((item) => {
      const salon = item.salon ?? item;
      return {
        ...salon,
        id: salon.id ?? item.salonId,
        // Ensure images is always an array
        images: salon.images ?? [],
        // Fallback: use logo or coverImage if images array is empty
        coverImage: salon.coverImage ?? salon.logo ?? null,
      } as Salon;
    });

    return {
      salons,
      total: response.data.pagination?.total ?? salons.length,
    };
  },

  /** Check if a specific salon is favorited */
  checkFavorite: async (salonId: string): Promise<{ isFavorite: boolean }> => {
    const response = await apiClient.get(`/users/favorites/check/${salonId}`);
    return response.data.data ?? { isFavorite: false };
  },

  /** Add a salon to favorites */
  addFavorite: async (salonId: string): Promise<void> => {
    await apiClient.post('/users/favorites', { salonId });
  },

  /** Remove a salon from favorites */
  removeFavorite: async (salonId: string): Promise<void> => {
    await apiClient.delete(`/users/favorites/${salonId}`);
  },
};
