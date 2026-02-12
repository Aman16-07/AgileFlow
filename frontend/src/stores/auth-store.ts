import { create } from 'zustand';
import { api } from '@/lib/api';
import type { User } from '@/types';

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@projectflow.dev',
  displayName: 'Demo User',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USER,
  isLoading: false,
  isAuthenticated: true,

  login: async () => {
    set({ user: DEMO_USER, isAuthenticated: true, isLoading: false });
  },

  register: async () => {
    set({ user: DEMO_USER, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // no-op in demo mode
  },

  fetchMe: async () => {
    set({ user: DEMO_USER, isAuthenticated: true, isLoading: false });
  },
}));
