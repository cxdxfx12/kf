import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  realName: string;
  role: string;
  phone: string;
  email: string;
}

interface AuthState {
  token: string;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const initialToken = localStorage.getItem('token') || '';
const initialUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
})();

export const useAuth = create<AuthState>(set => ({
  token: initialToken,
  user: initialUser,
  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: '', user: null });
  },
}));
