import { create } from 'zustand';
import { api, getToken, setToken } from '../lib/api';
import type { User } from '../lib/types';
import { applyTheme, loadTheme, type Mode, type ThemeState } from '../theme/themes';

interface AppState {
  user: User | null;
  ready: boolean;
  theme: ThemeState;
  init: () => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  setMode: (m: Mode) => void;
  setAccent: (a: string) => void;
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  ready: false,
  theme: loadTheme(),

  init: async () => {
    applyTheme(get().theme);
    if (getToken()) {
      try {
        const { user } = await api.get<{ user: User }>('/me');
        set({ user });
      } catch {
        setToken(null);
      }
    }
    set({ ready: true });
  },

  login: async (username, password) => {
    const { token, user } = await api.login(username, password);
    setToken(token);
    set({ user });
  },

  logout: () => {
    setToken(null);
    set({ user: null });
  },

  setMode: (mode) => {
    const theme = { ...get().theme, mode };
    applyTheme(theme);
    set({ theme });
  },
  setAccent: (accent) => {
    const theme = { ...get().theme, accent };
    applyTheme(theme);
    set({ theme });
  },
}));
