import api from './api';
import type { Route, AddRouteResponse } from '../types';

export const routeService = {
  getAll:  ()                            => api.get<Route[]>('/routes').then(r => r.data),
  getById: (id: string)                  => api.get<Route>(`/routes/${id}`).then(r => r.data),
  add:     (data: Omit<Route, '_id' | 'createdAt' | 'updatedAt'>) =>
             api.post<AddRouteResponse>('/routes', data).then(r => r.data),
  update:  (id: string, data: Partial<Route>) =>
             api.put<Route>(`/routes/${id}`, data).then(r => r.data),
  delete:  (id: string)                  => api.delete(`/routes/${id}`).then(r => r.data),
};