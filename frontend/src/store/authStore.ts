import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'Field Inspector' | 'Command Commissioner' | 'Transit Planner';

export interface User {
  username: string;
  role: Role;
  police_station?: string;
  token?: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

// Default mock users list kept as local reference for login helper descriptions
export const MOCK_USERS: Record<string, { password: string; user: User }> = {
  commissioner1: {
    password: 'password',
    user: { username: 'commissioner1', role: 'Command Commissioner', email: 'commissioner@resilio.gov', token: 'mock-jwt-commissioner' }
  },
  inspector1: {
    password: 'password',
    user: { username: 'inspector1', role: 'Field Inspector', email: 'inspector@resilio.gov', police_station: 'Yelahanka', token: 'mock-jwt-inspector' }
  },
  planner1: {
    password: 'password',
    user: { username: 'planner1', role: 'Transit Planner', email: 'planner@resilio.gov', token: 'mock-jwt-planner' }
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'resilio-auth' }
  )
);
