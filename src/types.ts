export interface AreaStatus {
  area: string;
  cumplido: boolean;
  fechaRespuesta: string;
}

export interface Expediente {
  id: string;
  numero: string;
  asunto: string;
  areaServicio: AreaStatus[];
  fechaInicio: string;
  fechaVencimiento: string;
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
