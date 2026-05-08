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
  showAuthModal: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingBooking: (booking: PendingBooking | null) => void;
  setShowAuthModal: (show: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  pendingBooking: null,
  showAuthModal: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  setPendingBooking: (booking) => set({ pendingBooking: booking }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  logout: () => set({ user: null, isAuthenticated: false, pendingBooking: null, showAuthModal: false }),
}));
