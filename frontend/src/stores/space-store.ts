import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Space } from '@/types';

interface SpaceState {
  spaces: Space[];
  currentSpace: Space | null;
  isLoading: boolean;

  fetchSpaces: () => Promise<void>;
  fetchSpaceByKey: (key: string) => Promise<Space>;
  createSpace: (data: {
    name: string;
    key: string;
    description?: string;
    visibility?: string;
  }) => Promise<Space>;
  setCurrentSpace: (space: Space | null) => void;
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [],
  currentSpace: null,
  isLoading: false,

  fetchSpaces: async () => {
    set({ isLoading: true });
    try {
      // This goes through the user endpoint to get spaces the user is a member of
      const { data } = await api.get('/auth/me');
      // Use a separate endpoint for user spaces
      // In production, we'd have a GET /spaces endpoint with user filtering
      // For now, fetch via dashboard
      const { data: dashboard } = await api.get('/dashboard/for-you');
      set({ spaces: dashboard.recentSpaces || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSpaceByKey: async (key: string) => {
    const { data } = await api.get(`/spaces/${key}`);
    set({ currentSpace: data });
    return data;
  },

  createSpace: async (spaceData) => {
    const { data } = await api.post('/spaces', spaceData);
    set((state) => ({ spaces: [data, ...state.spaces] }));
    return data;
  },

  setCurrentSpace: (space) => set({ currentSpace: space }),
}));
