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
    return {
      salons: Array.isArray(data) ? data : data?.salons ?? [],
      total: response.data.pagination?.total ?? (Array.isArray(data) ? data.length : 0),
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
