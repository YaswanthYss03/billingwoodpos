import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  username?: string;
}

interface Tenant {
  id: string;
  name: string;
  businessType: string;
  settings?: any;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),
  
  setTenant: (tenant) => set({ tenant }),

  hasRole: (roles: string | string[]) => {
    const { user } = get();
    if (!user) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  },

  login: async (username: string, password: string) => {
    // Call backend login API directly
    const response = await api.auth.login({ username, password });
    
    if (!response.data) {
      throw new Error('Login failed');
    }

    // Store the access token
    localStorage.setItem('accessToken', response.data.accessToken);
    
    // Set user and tenant from response
    set({ 
      user: response.data.user, 
      tenant: response.data.tenant,
      loading: false 
    });
  },

  logout: async () => {
    localStorage.removeItem('accessToken');
    set({ user: null, tenant: null, loading: false });
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        set({ user: null, tenant: null, loading: false });
        return;
      }

      const response = await api.auth.me();
      
      set({ 
        user: response.data, 
        tenant: response.data.tenant,
        loading: false 
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      set({ user: null, tenant: null, loading: false });
    }
  },
}));
