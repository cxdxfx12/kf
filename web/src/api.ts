import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (!location.pathname.startsWith('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ==== 认证 ====
export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (oldPwd: string, newPwd: string) => api.post('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd }),
};

// ==== 用户 ====
export const userApi = {
  list: (params?: any) => api.get('/users', { params }),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  del: (id: number) => api.delete(`/users/${id}`),
};

// ==== 客户 ====
export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }),
  detail: (id: number) => api.get(`/customers/${id}`),
  byPhone: (phone: string) => api.get(`/customers/phone/${phone}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  del: (id: number) => api.delete(`/customers/${id}`),
};

// ==== 订单 ====
export const orderApi = {
  list: (params?: any) => api.get('/orders', { params }),
  detail: (id: number) => api.get(`/orders/${id}`),
  byTracking: (tn: string) => api.get(`/orders/tracking/${tn}`),
  track: (tn: string, courier?: string) => api.get(`/orders/track/${tn}`, { params: { courier } }),
  couriers: () => api.get('/orders/api/couriers'),
  create: (data: any) => api.post('/orders', data),
  update: (id: number, data: any) => api.put(`/orders/${id}`, data),
  del: (id: number) => api.delete(`/orders/${id}`),
};

// ==== 工单 ====
export const ticketApi = {
  list: (params?: any) => api.get('/tickets', { params }),
  detail: (id: number) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: number, data: any) => api.put(`/tickets/${id}`, data),
  updateStatus: (id: number, data: any) => api.put(`/tickets/${id}/status`, data),
  assign: (id: number, assignedTo: number) => api.put(`/tickets/${id}/assign`, { assignedTo }),
  addComment: (id: number, content: string, type?: string) => api.post(`/tickets/${id}/comments`, { content, type }),
  del: (id: number) => api.delete(`/tickets/${id}`),
};

// ==== 通话 ====
export const callApi = {
  list: (params?: any) => api.get('/calls', { params }),
  detail: (id: number) => api.get(`/calls/${id}`),
  update: (id: number, data: any) => api.put(`/calls/${id}`, data),
};

// ==== 报表 ====
export const reportApi = {
  dashboard: () => api.get('/reports/dashboard'),
  ticketTrends: () => api.get('/reports/trends/tickets'),
  callTrends: () => api.get('/reports/trends/calls'),
};

// ==== AI / 呼叫中心 ====
export const aiApi = {
  suggest: (type: string, description: string) => api.post('/ai/suggest', { type, description }),
  chat: (message: string, systemPrompt?: string) => api.post('/ai/chat', { message, systemPrompt }),
  makeCall: (from: string, to: string) => api.post('/ai/call', { from, to }),
  simulateCall: (phone?: string, name?: string) => api.post('/ai/simulate-call', { customerPhone: phone, customerName: name }),
  providers: () => api.get('/ai/providers'),
  configList: () => api.get('/ai/config'),
  configSet: (key: string, value: string, description?: string) => api.post('/ai/config', { key, value, description }),
};

export default api;
