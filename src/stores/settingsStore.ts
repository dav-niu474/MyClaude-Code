import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  model: string;
  temperature: number;
  systemPrompt: string;
  sidebarCollapsed: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setModel: (model: string) => void;
  setTemperature: (t: number) => void;
  setSystemPrompt: (p: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      model: 'default',
      temperature: 0.7,
      systemPrompt: '',
      sidebarCollapsed: false,

      setTheme: (theme) => set({ theme }),
      setModel: (model) => set({ model }),
      setTemperature: (t) => set({ temperature: t }),
      setSystemPrompt: (p) => set({ systemPrompt: p }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'mycc-settings',
    }
  )
);
