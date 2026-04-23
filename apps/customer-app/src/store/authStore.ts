import { create } from 'zustand';
import { User } from '../types';

interface PendingBooking {
  salonId: string;
  salonName: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingBooking: PendingBooking | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingBooking: (booking: PendingBooking | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  pendingBooking: null,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPendingBooking: (booking) => set({ pendingBooking: booking }),
  logout: () => set({ user: null, isAuthenticated: false, pendingBooking: null }),
}));
