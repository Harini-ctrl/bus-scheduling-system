import api from './api';
import type { Schedule, AddScheduleResponse } from '../types';

export interface CreateScheduleInput {
  busId: string;
  driverId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  dutyType: 'linked' | 'unlinked';
  restDuration?: number;
}

export const scheduleService = {
  getAll:       ()                              => api.get<Schedule[]>('/schedules').then(r => r.data),
  getById:      (id: string)                    => api.get<Schedule>(`/schedules/${id}`).then(r => r.data),
  add:          (data: CreateScheduleInput)     =>
                  api.post<AddScheduleResponse>('/schedules', data).then(r => r.data),
  updateStatus: (id: string, status: Schedule['status']) =>
                  api.patch(`/schedules/${id}/status`, { status }).then(r => r.data),
  delete:       (id: string)                    => api.delete(`/schedules/${id}`).then(r => r.data),
};