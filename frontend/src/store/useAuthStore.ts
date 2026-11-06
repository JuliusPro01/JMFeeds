import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: 'OWNER' | 'OPERATOR' | 'ADMIN';
  permissions?: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('feedpro_token'),
  user: localStorage.getItem('feedpro_user') ? JSON.parse(localStorage.getItem('feedpro_user')!) : null,
  setAuth: (token, user) => {
    localStorage.setItem('feedpro_token', token);
    localStorage.setItem('feedpro_user', JSON.stringify(user));
    set({ token, user });
  },
  updateUser: (partialUser) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...partialUser };
      localStorage.setItem('feedpro_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
  logout: () => {
    localStorage.removeItem('feedpro_token');
    localStorage.removeItem('feedpro_user');
    set({ token: null, user: null });
  },
}));
