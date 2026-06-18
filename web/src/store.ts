import { create } from 'zustand';

interface User { id: number; username: string; realName: string; role: string; phone: string; email?: string; }

interface AppStore {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => void;
}

const initToken = localStorage.getItem('token');
const initUser = (() => {
  try { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch { return null; }
})();

export const useAppStore = create<AppStore>((set) => ({
  token: initToken,
  user: initUser,
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
  refresh: () => set({}),
}));
