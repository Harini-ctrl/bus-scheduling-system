import api from './api';
import type { Bus } from '../types';

export const busService = {
  getAll:  ()                        => api.get<Bus[]>('/buses').then(r => r.data),
  getById: (id: string)              => api.get<Bus>(`/buses/${id}`).then(r => r.data),
  add:     (data: Omit<Bus, '_id' | 'createdAt' | 'updatedAt'>) =>
             api.post<Bus>('/buses', data).then(r => r.data),
  update:  (id: string, data: Partial<Bus>) =>
             api.put<Bus>(`/buses/${id}`, data).then(r => r.data),
  delete:  (id: string)              => api.delete(`/buses/${id}`).then(r => r.data),
};