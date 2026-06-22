import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Role } from '../lib/constants';
import { ROLES } from '../lib/constants';

export type { Role };
export { ROLES };

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
    user: { username: 'commissioner1', role: ROLES.COMMAND_COMMISSIONER, email: 'commissioner@resilio.gov', token: 'mock-jwt-commissioner' }
  },
  inspector1: {
    password: 'password',
    user: { username: 'inspector1', role: ROLES.FIELD_INSPECTOR, email: 'inspector@resilio.gov', police_station: 'Yelahanka', token: 'mock-jwt-inspector' }
  },
  planner1: {
    password: 'password',
    user: { username: 'planner1', role: ROLES.TRANSIT_PLANNER, email: 'planner@resilio.gov', token: 'mock-jwt-planner' }
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
