import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '../queryClient';

interface AuthState {
  token: string | null;
  username: string | null;
  setAuth: (token: string, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      setAuth: (token, username) => {
        queryClient.clear();
        set({ token, username });
      },
      logout: () => {
        queryClient.clear();
        set({ token: null, username: null });
      },
    }),
    { name: 'vinaphone-auth' },
  ),
);

/** Read token outside React (used by axios interceptor) */
export const getAuthToken = (): string | null => useAuthStore.getState().token;
