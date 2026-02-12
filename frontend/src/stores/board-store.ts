import { create } from 'zustand';
import { api } from '@/lib/api';
import type { BoardColumn, Task } from '@/types';

interface BoardState {
  columns: BoardColumn[];
  isLoading: boolean;

  fetchBoardView: (spaceId: string, sprintId?: string) => Promise<void>;

  // Optimistic drag-and-drop update
  moveTaskOptimistic: (
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
    newIndex: number,
  ) => void;

  // Persist move to backend
  persistTaskMove: (
    taskId: string,
    targetStatusId: string,
    targetPosition: number,
  ) => Promise<void>;

  // Add task to board
  addTask: (task: Task) => void;

  // Update task in-place
  updateTaskInBoard: (task: Task) => void;

  // Remove task
  removeTask: (taskId: string) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  columns: [],
  isLoading: false,

  fetchBoardView: async (spaceId, sprintId) => {
    set({ isLoading: true });
    try {
      const params = sprintId ? `?sprintId=${sprintId}` : '';
      const { data } = await api.get(`/spaces/${spaceId}/boards/view${params}`);
      set({ columns: data.columns, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  moveTaskOptimistic: (taskId, fromColumnId, toColumnId, newIndex) => {
    set((state) => {
      const columns = state.columns.map((col) => ({ ...col, tasks: [...col.tasks] }));

      // Remove from source column
      const sourceCol = columns.find((c) => c.id === fromColumnId);
      if (!sourceCol) return state;

      const taskIndex = sourceCol.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return state;

      const [task] = sourceCol.tasks.splice(taskIndex, 1);

      // Add to target column
      const targetCol = columns.find((c) => c.id === toColumnId);
      if (!targetCol) return state;

      // Update task's status
      const updatedTask = {
        ...task,
        statusId: toColumnId,
        status: {
          id: targetCol.id,
          name: targetCol.name,
          slug: targetCol.slug,
          color: targetCol.color,
          position: targetCol.position,
          category: targetCol.category as Task['status']['category'],
        },
      };

      targetCol.tasks.splice(newIndex, 0, updatedTask);

      return { columns };
    });
  },

  persistTaskMove: async (taskId, targetStatusId, targetPosition) => {
    try {
      await api.patch('/tasks/move', { taskId, targetStatusId, targetPosition });
    } catch (error) {
      // If persist fails, refetch the board to reset state
      console.error('Failed to persist task move:', error);
    }
  },

  addTask: (task) => {
    set((state) => {
      const columns = state.columns.map((col) => {
        if (col.id === task.statusId) {
          return { ...col, tasks: [...col.tasks, task] };
        }
        return col;
      });
      return { columns };
    });
  },

  updateTaskInBoard: (updatedTask) => {
    set((state) => {
      const columns = state.columns.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)),
      }));
      return { columns };
    });
  },

  removeTask: (taskId) => {
    set((state) => {
      const columns = state.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));
      return { columns };
    });
  },
}));
