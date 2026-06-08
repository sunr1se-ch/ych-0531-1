import { create } from 'zustand';
import type { Dehumidifier, CollectionBatch, DefrostTodoItem, SystemConfig, InspectionWorkbenchItem } from '../types';
import { api } from '../utils/api';

interface AppState {
  dehumidifiers: Dehumidifier[];
  collections: CollectionBatch[];
  defrostTodos: DefrostTodoItem[];
  workbenchItems: InspectionWorkbenchItem[];
  systemConfig: SystemConfig | null;
  loading: boolean;
  error: string | null;
  selectedStatusFilter: string;
  fetchSystemConfig: () => Promise<void>;
  fetchDehumidifiers: (status?: string) => Promise<void>;
  fetchCollections: () => Promise<void>;
  fetchDefrostTodos: () => Promise<void>;
  fetchWorkbench: () => Promise<InspectionWorkbenchItem[]>;
  setStatusFilter: (status: string) => void;
  refreshAll: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  dehumidifiers: [],
  collections: [],
  defrostTodos: [],
  workbenchItems: [],
  systemConfig: null,
  loading: false,
  error: null,
  selectedStatusFilter: 'all',

  fetchSystemConfig: async () => {
    try {
      const response = await api.config.get();
      set({ systemConfig: response.data });
    } catch (err) {
      console.error('Failed to fetch system config:', err);
    }
  },

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

  fetchWorkbench: async () => {
    try {
      const response = await api.inspection.getWorkbench();
      set({ workbenchItems: response.data });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch workbench:', err);
      return [];
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
      get().fetchWorkbench(),
    ]);
  },
}));
