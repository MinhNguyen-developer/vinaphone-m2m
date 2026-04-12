/**
 * useStore - UI-only local state
 *
 * All server state (sims, groups, masterSims, alerts, triggeredAlerts) is now
 * managed by TanStack Query hooks in src/hooks/.
 *
 * Alert check state has moved server-side via
 * PATCH /alerts/triggered/:simId/:alertId/check.
 */
import { create } from 'zustand';

interface UIState {
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
}));
