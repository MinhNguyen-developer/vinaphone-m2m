import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SimStatus } from '../types';
import type { SimCard, ProductGroup, MasterSim, AlertConfig } from '../types';
import { mockSims, mockGroups, mockMasterSims, mockAlerts } from '../data/mockData';
import { generateId, getCurrentMonth } from '../utils';

interface State {
  sims: SimCard[];
  groups: ProductGroup[];
  masterSims: MasterSim[];
  alerts: AlertConfig[];

  // SIM actions
  addSim: (sim: Omit<SimCard, 'id' | 'createdAt' | 'usageHistory' | 'alerts' | 'status' | 'usedMB'>) => void;
  updateSim: (id: string, updates: Partial<SimCard>) => void;
  deleteSim: (id: string) => void;
  confirmSim: (id: string) => void;
  resetSim: (id: string) => void;
  triggerFirstUsage: (id: string, usedMB: number, firstUsedAt?: string) => void;
  updateMonthlyUsage: (id: string, month: string, usedMB: number) => void;

  // Group actions
  addGroup: (group: Omit<ProductGroup, 'id' | 'createdAt'>) => void;
  updateGroup: (id: string, updates: Partial<ProductGroup>) => void;
  deleteGroup: (id: string) => void;

  // Alert actions
  addAlert: (alert: Omit<AlertConfig, 'id'>) => void;
  updateAlert: (id: string, updates: Partial<AlertConfig>) => void;
  deleteAlert: (id: string) => void;
  checkAndTriggerAlerts: () => SimCard[];

  // Master SIM actions
  addMasterSim: (sim: Omit<MasterSim, 'id'>) => void;
  updateMasterSim: (id: string, updates: Partial<MasterSim>) => void;
  deleteMasterSim: (id: string) => void;

  // Alert review tracking (local UI state)
  checkedAlertPairs: string[];  // keys: `${simId}-${alertId}`
  toggleAlertCheck: (key: string) => void;
  clearCheckedAlerts: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      sims: mockSims,
      groups: mockGroups,
      masterSims: mockMasterSims,
      alerts: mockAlerts,
      checkedAlertPairs: [],

      // ========== SIM ACTIONS ==========
      addSim: (simData) =>
        set((state) => ({
          sims: [
            ...state.sims,
            {
              ...simData,
              id: generateId(),
              status: SimStatus.NEW,
              usedMB: 0,
              createdAt: new Date().toISOString().split('T')[0],
              usageHistory: [],
              alerts: [],
            },
          ],
        })),

      updateSim: (id, updates) =>
        set((state) => ({
          sims: state.sims.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      deleteSim: (id) =>
        set((state) => ({
          sims: state.sims.filter((s) => s.id !== id),
        })),

      confirmSim: (id) =>
        set((state) => ({
          sims: state.sims.map((s) =>
            s.id === id
              ? { ...s, status: SimStatus.CONFIRMED, confirmedAt: new Date().toLocaleString('vi-VN') }
              : s
          ),
        })),

      resetSim: (id) =>
        set((state) => ({
          sims: state.sims.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: SimStatus.NEW,
                  usedMB: 0,
                  firstUsedAt: undefined,
                  confirmedAt: undefined,
                  note: '',
                }
              : s
          ),
        })),

      triggerFirstUsage: (id, usedMB, firstUsedAt) => {
        const sim = get().sims.find((s) => s.id === id);
        if (!sim) return;
        const currentMonth = getCurrentMonth();
        const existingHistory = sim.usageHistory.find((h) => h.month === currentMonth);
        set((state) => ({
          sims: state.sims.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: SimStatus.ACTIVE,
                  usedMB,
                  firstUsedAt: firstUsedAt ?? new Date().toLocaleString('vi-VN'),
                  usageHistory: existingHistory
                    ? s.usageHistory.map((h) =>
                        h.month === currentMonth ? { ...h, usedMB } : h
                      )
                    : [...s.usageHistory, { month: currentMonth, usedMB }],
                }
              : s
          ),
        }));
      },

      updateMonthlyUsage: (id, month, usedMB) =>
        set((state) => ({
          sims: state.sims.map((s) => {
            if (s.id !== id) return s;
            const existing = s.usageHistory.find((h) => h.month === month);
            return {
              ...s,
              usedMB: month === getCurrentMonth() ? usedMB : s.usedMB,
              usageHistory: existing
                ? s.usageHistory.map((h) => (h.month === month ? { ...h, usedMB } : h))
                : [...s.usageHistory, { month, usedMB }],
            };
          }),
        })),

      // ========== GROUP ACTIONS ==========
      addGroup: (groupData) =>
        set((state) => ({
          groups: [
            ...state.groups,
            {
              ...groupData,
              id: generateId(),
              createdAt: new Date().toISOString().split('T')[0],
            },
          ],
        })),

      updateGroup: (id, updates) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          sims: state.sims.map((s) => ({
            ...s,
            groupIds: s.groupIds.filter((gid) => gid !== id),
          })),
        })),

      // ========== ALERT ACTIONS ==========
      addAlert: (alertData) =>
        set((state) => ({
          alerts: [...state.alerts, { ...alertData, id: generateId() }],
        })),

      updateAlert: (id, updates) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      deleteAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      checkAndTriggerAlerts: () => {
        const { sims, alerts } = get();
        const triggered: SimCard[] = [];

        sims.forEach((sim) => {
          const relatedAlerts = alerts.filter(
            (a) =>
              a.active &&
              (a.simId === sim.id ||
                (a.groupId && sim.groupIds.includes(a.groupId)) ||
                (a.productCode && a.productCode === sim.productCode))
          );

          relatedAlerts.forEach((alert) => {
            if (sim.usedMB >= alert.thresholdMB) {
              if (!triggered.find((t) => t.id === sim.id)) {
                triggered.push(sim);
              }
            }
          });
        });

        return triggered;
      },

      // ========== MASTER SIM ACTIONS ==========
      addMasterSim: (simData) =>
        set((state) => ({
          masterSims: [...state.masterSims, { ...simData, id: generateId() }],
        })),

      updateMasterSim: (id, updates) =>
        set((state) => ({
          masterSims: state.masterSims.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      deleteMasterSim: (id) =>
        set((state) => ({
          masterSims: state.masterSims.filter((m) => m.id !== id),
        })),

      // ========== ALERT REVIEW ==========
      toggleAlertCheck: (key) =>
        set((state) => ({
          checkedAlertPairs: state.checkedAlertPairs.includes(key)
            ? state.checkedAlertPairs.filter((k) => k !== key)
            : [...state.checkedAlertPairs, key],
        })),

      clearCheckedAlerts: () => set({ checkedAlertPairs: [] }),
    }),
    {
      name: 'vinaphone-m2m-storage',
    }
  )
);
