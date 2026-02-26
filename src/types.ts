export interface Expediente {
  id: string;
  numero: string;
  asunto: string;
  areaServicio: string;
  fechaInicio: string;
  fechaVencimiento: string;
  fechaRespuesta: string;
  observacion: string;
  createdAt: number;
}

export type Status = 'red' | 'amber' | 'green';

export interface DailyReport {
  total: number;
  alDia: number;
  proximos: number;
  retrasados: number;
}
