import api from './api';
import type { Driver } from '../types';

export const driverService = {
  getAll:  ()                           => api.get<Driver[]>('/drivers').then(r => r.data),
  getById: (id: string)                 => api.get<Driver>(`/drivers/${id}`).then(r => r.data),
  add:     (data: Omit<Driver, '_id' | 'createdAt' | 'updatedAt'>) =>
             api.post<Driver>('/drivers', data).then(r => r.data),
  update:  (id: string, data: Partial<Driver>) =>
             api.put<Driver>(`/drivers/${id}`, data).then(r => r.data),
  delete:  (id: string)                 => api.delete(`/drivers/${id}`).then(r => r.data),
};