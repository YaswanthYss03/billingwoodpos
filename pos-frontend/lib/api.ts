import axios from 'axios';
import { getAccessToken } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and errors
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap backend's {success: true, data: ...} structure
    // If response has `data` property with nested `data`, unwrap it
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // Only redirect to login if it's not the initial auth check
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoints
export const api = {
  // Auth
  auth: {
    login: (data: { username: string; password: string }) => 
      apiClient.post('/auth/login', data),
    me: () => apiClient.get('/auth/me'),
  },

  // Categories
  categories: {
    list: () => apiClient.get('/categories'),
    get: (id: string) => apiClient.get(`/categories/${id}`),
    create: (data: any) => apiClient.post('/categories', data),
    update: (id: string, data: any) => apiClient.patch(`/categories/${id}`, data),
    delete: (id: string) => apiClient.delete(`/categories/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/categories/${id}/toggle-status`),
  },

  // Items
  items: {
    list: (categoryId?: string) => 
      apiClient.get('/items', { params: { categoryId } }),
    get: (id: string) => apiClient.get(`/items/${id}`),
    getStock: (id: string) => apiClient.get(`/items/${id}/stock`),
    create: (data: any) => apiClient.post('/items', data),
    update: (id: string, data: any) => apiClient.patch(`/items/${id}`, data),
    delete: (id: string) => apiClient.delete(`/items/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/items/${id}/toggle-status`),
  },

  // Inventory
  inventory: {
    batches: (itemId?: string) => 
      apiClient.get('/inventory/batches', { params: { itemId } }),
    getStock: (itemId: string) => apiClient.get(`/inventory/stock/${itemId}`),
    valuation: () => apiClient.get('/inventory/valuation'),
    lowStock: (threshold?: number) => 
      apiClient.get('/inventory/low-stock', { params: { threshold } }),
    adjust: (data: any) => apiClient.post('/inventory/adjust', data),
  },

  // Purchases
  purchases: {
    list: (status?: string) => 
      apiClient.get('/purchases', { params: { status } }),
    get: (id: string) => apiClient.get(`/purchases/${id}`),
    create: (data: any) => apiClient.post('/purchases', data),
    receive: (id: string, data?: any) => apiClient.post(`/purchases/${id}/receive`, data),
    cancel: (id: string, reason: string) => 
      apiClient.patch(`/purchases/${id}/cancel`, { reason }),
  },

  // Billing
  billing: {
    list: (params?: any) => apiClient.get('/billing', { params }),
    get: (id: string) => apiClient.get(`/billing/${id}`),
    getByNumber: (billNumber: string) => 
      apiClient.get(`/billing/number/${billNumber}`),
    create: (data: any) => apiClient.post('/billing', data),
    cancel: (id: string, reason: string) => 
      apiClient.post(`/billing/${id}/cancel`, { reason }),
  },

  // KOT
  kot: {
    list: (status?: string) => 
      apiClient.get('/kot', { params: { status } }),
    get: (id: string) => apiClient.get(`/kot/${id}`),
    create: (data: any) => apiClient.post('/kot', data),
    updateStatus: (id: string, status: string) => 
      apiClient.patch(`/kot/${id}/status`, { status }),
    cancel: (id: string, reason: string) => 
      apiClient.patch(`/kot/${id}/cancel`, { reason }),
  },

  // Printing
  printing: {
    pending: () => apiClient.get('/printing/pending'),
    list: (params?: any) => apiClient.get('/printing', { params }),
    get: (id: string) => apiClient.get(`/printing/${id}`),
    updateStatus: (id: string, status: string, error?: string) => 
      apiClient.patch(`/printing/${id}/status`, { status, error }),
    retry: (id: string) => apiClient.patch(`/printing/${id}/retry`),
  },

  // Reports
  reports: {
    dashboard: (refresh?: boolean) => 
      apiClient.get('/reports/dashboard', { params: { refresh: refresh ? 'true' : undefined } }),
    dailySales: (date?: string) => 
      apiClient.get('/reports/daily-sales', { params: { date } }),
    salesSummary: (startDate: string, endDate: string) => 
      apiClient.get('/reports/sales-summary', { params: { startDate, endDate } }),
    itemWiseSales: (startDate: string, endDate: string) => 
      apiClient.get('/reports/item-wise-sales', { params: { startDate, endDate } }),
    currentInventory: () => apiClient.get('/reports/current-inventory'),
    inventoryValuation: () => apiClient.get('/reports/inventory-valuation'),
    topSelling: (days?: number, limit?: number) => 
      apiClient.get('/reports/top-selling', { params: { days, limit } }),
  },

  // Users
  users: {
    list: () => apiClient.get('/users'),
    get: (id: string) => apiClient.get(`/users/${id}`),
    create: (data: any) => apiClient.post('/users', data),
    update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/users/${id}`),
    toggleStatus: (id: string) => apiClient.patch(`/users/${id}/toggle-status`),
  },

  // Tenants/Settings
  tenants: {
    getConfig: () => apiClient.get('/tenants/config'),
    getSettings: () => apiClient.get('/tenants/settings'),
    updateSettings: (data: any) => apiClient.patch('/tenants/settings', data),
    update: (data: any) => apiClient.patch('/tenants', data),
  },
};
