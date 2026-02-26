import { Status } from '../types';

export const calculateStatus = (fechaVencimiento: string, now: Date = new Date()): Status => {
  if (!fechaVencimiento) return 'green';
  
  const [year, month, day] = fechaVencimiento.split('-').map(Number);
  const dueDate = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'red';
  if (diffDays <= 1) return 'amber';
  return 'green';
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date using local time components to avoid UTC offset issues
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
