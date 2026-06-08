import { create } from 'zustand';
import type { Dehumidifier, CollectionBatch, DefrostTodoItem } from '../types';
import { api } from '../utils/api';

interface AppState {
  dehumidifiers: Dehumidifier[];
  collections: CollectionBatch[];
  defrostTodos: DefrostTodoItem[];
  loading: boolean;
  error: string | null;
  selectedStatusFilter: string;
  fetchDehumidifiers: (status?: string) => Promise<void>;
  fetchCollections: () => Promise<void>;
  fetchDefrostTodos: () => Promise<void>;
  setStatusFilter: (status: string) => void;
  refreshAll: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  dehumidifiers: [],
  collections: [],
  defrostTodos: [],
  loading: false,
  error: null,
  selectedStatusFilter: 'all',

  fetchDehumidifiers: async (status?: string) => {
    set({ loading: true, error: null });
    try {
      const filter = status ?? get().selectedStatusFilter;
      const response = await api.dehumidifiers.list(filter);
      set({ dehumidifiers: response.data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', loading: false });
    }
  },

  fetchCollections: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.collections.list();
      set({ collections: response.data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', loading: false });
    }
  },

  fetchDefrostTodos: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.defrostTodo.list();
      set({ defrostTodos: response.data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败', loading: false });
    }
  },

  setStatusFilter: (status: string) => {
    set({ selectedStatusFilter: status });
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchDehumidifiers(),
      get().fetchCollections(),
      get().fetchDefrostTodos(),
    ]);
  },
}));
