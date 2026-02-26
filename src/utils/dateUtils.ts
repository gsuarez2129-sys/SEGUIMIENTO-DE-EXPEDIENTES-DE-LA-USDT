import { Status } from '../types';

export const calculateStatus = (fechaVencimiento: string, now: Date = new Date()): Status => {
  const due = new Date(fechaVencimiento);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'red';
  if (diffDays <= 2) return 'amber';
  return 'green';
};

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
