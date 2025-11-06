import { useState } from 'react';
import { Toast } from '../components/Toast';

let id = 1;

export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    setToasts(prevToasts => [...prevToasts, { ...toast, id: id++ }]);
  };

  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
};
