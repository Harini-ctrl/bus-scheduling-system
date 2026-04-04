import { authService } from '../services/authService';

export function useRole() {
  const user = authService.getUser();
  const role = user?.role ?? 'viewer';

  return {
    isAdmin:     role === 'admin',
    isScheduler: role === 'scheduler',
    isViewer:    role === 'viewer',
    canEdit:     role === 'admin' || role === 'scheduler',
    canDelete:   role === 'admin',
  };
}