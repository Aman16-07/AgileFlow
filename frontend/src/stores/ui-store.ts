import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  taskDetailOpen: boolean;
  selectedTaskId: string | null;
  recentsDropdownOpen: boolean;
  createSpaceModalOpen: boolean;

  toggleSidebar: () => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  setRecentsDropdown: (open: boolean) => void;
  setCreateSpaceModal: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  taskDetailOpen: false,
  selectedTaskId: null,
  recentsDropdownOpen: false,
  createSpaceModalOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openTaskDetail: (taskId) => set({ taskDetailOpen: true, selectedTaskId: taskId }),
  closeTaskDetail: () => set({ taskDetailOpen: false, selectedTaskId: null }),
  setRecentsDropdown: (open) => set({ recentsDropdownOpen: open }),
  setCreateSpaceModal: (open) => set({ createSpaceModalOpen: open }),
}));
