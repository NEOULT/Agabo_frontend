import { create } from 'zustand';

interface UIState {
  /**
   * Sidebar de escritorio (`lg` en adelante) expandida o reducida a iconos.
   * En móvil no aplica: la navegación vive en `mobileNavOpen`.
   */
  sidebarOpen: boolean;
  /** Cajón de navegación de móvil, oculto por defecto. */
  mobileNavOpen: boolean;
  theme: 'light' | 'dark';

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileNavOpen: false,
  theme: 'light',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
  setTheme: (theme) => set({ theme }),
}));
