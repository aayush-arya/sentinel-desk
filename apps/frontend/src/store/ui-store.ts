import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

// Client-only UI preferences. Server-fetched data (current user, tickets, etc.)
// belongs in TanStack Query, not here — this store never holds anything the API returns.
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    { name: 'sentinel-ui', partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }) },
  ),
);
