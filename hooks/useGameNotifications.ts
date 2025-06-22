
import { useState, useCallback } from 'react';

export interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export const useGameNotifications = () => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((message: string, type: NotificationState['type']) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' || type === 'warning' ? 7000 : 4000);
  }, []);

  return { notification, showNotification };
};
