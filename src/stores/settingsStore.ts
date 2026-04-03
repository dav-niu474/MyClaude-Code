import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  model: string;
  sidebarCollapsed: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setModel: (model: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      model: 'default',
      sidebarCollapsed: false,

      setTheme: (theme) => set({ theme }),
      setModel: (model) => set({ model }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'mycc-settings',
    }
  )
);
