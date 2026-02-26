import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  LayoutDashboard,
  ClipboardList,
  Search,
  Edit2,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import io from 'socket.io-client';
import { Expediente, DailyReport } from './types';
import { calculateStatus, formatDate } from './utils/dateUtils';

interface ReportCardProps {
  label: string;
  value: number;
  color?: string;
  icon: React.ReactNode;
}

const ReportCard: React.FC<ReportCardProps> = ({ label, value, color = "text-[#141414]", icon }) => {
  return (
    <div className="bg-white p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">{label}</span>
        <div className="opacity-20">{icon}</div>
      </div>
      <span className={`text-4xl font-light tracking-tighter ${color}`}>{value}</span>
    </div>
  );
};

interface ExpedienteRowProps {
  exp: Expediente;
  onDelete: () => void;
  onEdit: () => void;
  onToggleCumplido: (id: string, area: string) => void;
}

const AREAS_SERVICIOS = [
  "SUST-Servicio de Farmacia",
  "SUST-Servicio de Nutrición y Dietética",
  "SUSD-Servicio de Hemoterapia y Banco de Sangre",
  "SUSD-Servicio de Patología Clínica",
  "SUSD-Servicio de Anatomía Patológica",
  "SUSD-Servicio de Diagnóstico por Imágenes",
  "SUSD-Servicio de Genética",
  "SUASP-Área Referencia y Contrareferencia",
  "SUASP-Área de Telesalud",
  "SUASP-Servicio de Admisión",
  "SUASP-Área de Trabajo Social"
];

const ExpedienteRow: React.FC<ExpedienteRowProps> = ({ exp, onDelete, onEdit, onToggleCumplido }) => {
  const status = calculateStatus(exp.fechaVencimiento);
  
  const statusConfig = {
    red: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Vencido' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Próximo / Hoy' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Vigente' }
  };

  const config = statusConfig[status];

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-1 md:grid-cols-[100px_1fr_1.2fr_100px_80px_80px_80px_1.2fr_40px] p-4 items-center gap-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="font-mono text-xs font-bold">{exp.numero}</div>
      <div className="font-serif italic text-sm truncate" title={exp.asunto}>{exp.asunto}</div>
      <div className="flex flex-col">
        {exp.areaServicio.map((item) => (
          <div key={`area-name-${item.area}`} className="h-10 flex items-center border-b border-gray-100 last:border-0">
            <div className="text-[9px] font-bold opacity-70 leading-tight">{item.area}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        {exp.areaServicio.map((item) => (
          <div key={`area-status-${item.area}`} className="h-10 flex flex-col justify-center border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={item.cumplido} 
                onChange={() => onToggleCumplido(exp.id, item.area)}
                className="w-3 h-3 cursor-pointer accent-[#141414]"
              />
              <span className="text-[8px] opacity-50">
                {item.fechaRespuesta ? formatDate(item.fechaRespuesta) : 'Pend.'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] opacity-60 flex flex-col">
        <span className="font-bold uppercase text-[8px]">Inicio</span>
        {formatDate(exp.fechaInicio)}
      </div>
      <div className="text-[10px] opacity-60 flex flex-col">
        <span className="font-bold uppercase text-[8px]">Venc.</span>
        {formatDate(exp.fechaVencimiento)}
      </div>
      <div>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
          {config.label}
        </span>
      </div>
      <div className="text-xs opacity-70 italic line-clamp-2" title={exp.observacion}>
        {exp.observacion || '-'}
      </div>
      <div className="text-right flex items-center justify-end gap-1">
        <button 
          onClick={onEdit}
          className="p-2 hover:bg-indigo-100 text-indigo-600 rounded-sm transition-colors cursor-pointer"
          title="Editar"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => {
            if (window.confirm('¿Está seguro de que desea eliminar este expediente?')) {
              onDelete();
            }
          }}
          className="p-2 hover:bg-rose-100 text-rose-600 rounded-sm transition-colors cursor-pointer"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [serverDataCount, setServerDataCount] = useState<number | null>(null);
  const [useRestFallback, setUseRestFallback] = useState(false);
  const [transportType, setTransportType] = useState<'websocket' | 'polling' | 'none'>('none');

  const fetchExpedientesRest = async () => {
    try {
      console.log('[REST] Intentando cargar datos...');
      const res = await fetch('/api/expedientes');
      if (res.ok) {
        const data = await res.json();
        setExpedientes(data);
        setServerDataCount(data.length);
        console.log('[REST] Datos cargados con éxito. Registros:', data.length);
        return true;
      }
      console.error('[REST] Error en respuesta:', res.status);
    } catch (e) {
      console.error('[REST] Error de red:', e);
    }
    return false;
  };

  const saveExpedientesRest = async (data: Expediente[]) => {
    try {
      const res = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.error('[REST] Error al guardar:', e);
      return false;
    }
  };

  const connectSocket = () => {
    if (socket) {
      socket.disconnect();
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    console.log('[Socket] Iniciando conexión profesional...');
    
    // Carga inicial vía REST para disponibilidad inmediata
    fetchExpedientesRest();

    // Configuración experta: Intentamos WebSocket primero, si falla Socket.io bajará a Polling automáticamente
    // o podemos manejarlo nosotros para mayor control.
    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 15000,
      autoConnect: true,
      forceNew: true
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      const transport = (newSocket as any).io?.engine?.transport?.name || 'unknown';
      console.log(`[Socket] Conectado con éxito. ID: ${newSocket.id} | Transporte: ${transport}`);
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setUseRestFallback(false);
      setTransportType(transport as any);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Error de conexión:', err.message);
      setConnectionError(err.message);
      
      // Si falla, activamos el modo REST para no bloquear al usuario
      setUseRestFallback(true);
      // No detenemos isConnecting para permitir que socket.io siga intentando en segundo plano
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconectado tras', attemptNumber, 'intentos');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setUseRestFallback(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Desconectado. Razón:', reason);
      setIsConnected(false);
      setTransportType('none');
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setIsConnecting(true);
      }
    });

    newSocket.on('init', (initialData: Expediente[]) => {
      console.log('[Socket] Datos iniciales recibidos:', initialData.length);
      setServerDataCount(initialData.length);
      setExpedientes(initialData);
    });

    newSocket.on('sync_expedientes', (syncedData: Expediente[]) => {
      console.log('[Socket] Sincronización recibida:', syncedData.length);
      setServerDataCount(syncedData.length);
      setExpedientes(syncedData);
      localStorage.setItem('expedientes', JSON.stringify(syncedData));
    });

    return newSocket;
  };

  // Initialize Socket.io
  useEffect(() => {
    const s = connectSocket();
    return () => {
      if (s) s.close();
    };
  }, []);

  const uploadLocalToServer = () => {
    const saved = localStorage.getItem('expedientes');
    if (saved && socket) {
      try {
        const localData = JSON.parse(saved);
        if (confirm(`¿Desea subir ${localData.length} expedientes locales al servidor? Esto sobrescribirá los datos en la nube.`)) {
          socket.emit('update_expedientes', localData);
          alert('Datos enviados al servidor con éxito.');
        }
      } catch (e) {
        alert('Error al leer datos locales.');
      }
    } else {
      alert('No hay datos locales para subir o no hay conexión.');
    }
  };

  const forceSync = () => {
    if (socket) {
      socket.emit('get_latest'); // We'll add this handler to server
    } else {
      window.location.reload();
    }
  };

  // Sync with server on change
  const copyAppLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Enlace copiado al portapapeles. Puedes abrirlo en otros ordenadores.');
    });
  };

  const syncWithServer = (newExpedientes: Expediente[]) => {
    setExpedientes(newExpedientes);
    localStorage.setItem('expedientes', JSON.stringify(newExpedientes));
    if (isConnected && socket) {
      socket.emit('update_expedientes', newExpedientes);
    } else if (useRestFallback) {
      saveExpedientesRest(newExpedientes);
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    numero: '',
    asunto: '',
    areaServicio: [] as string[],
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    observacion: ''
  });

  // Load from local storage - REMOVED for WebSocket sync
  /*
  useEffect(() => {
    const saved = localStorage.getItem('expedientes');
    if (saved) {
      try {
        setExpedientes(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading expedientes', e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('expedientes', JSON.stringify(expedientes));
  }, [expedientes]);
  */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let newExpedientes: Expediente[];
    if (editingId) {
      newExpedientes = expedientes.map(exp => {
        if (exp.id === editingId) {
          // Merge existing area statuses with new selections
          const updatedAreas = formData.areaServicio.map(areaName => {
            const existing = exp.areaServicio.find(a => a.area === areaName);
            return existing || { area: areaName, cumplido: false, fechaRespuesta: '' };
          });
          return { ...exp, ...formData, areaServicio: updatedAreas };
        }
        return exp;
      });
    } else {
      const newExpediente: Expediente = {
        id: crypto.randomUUID(),
        ...formData,
        areaServicio: formData.areaServicio.map(area => ({
          area,
          cumplido: false,
          fechaRespuesta: ''
        })),
        createdAt: Date.now()
      };
      newExpedientes = [newExpediente, ...expedientes];
    }

    syncWithServer(newExpedientes);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      numero: '',
      asunto: '',
      areaServicio: [],
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      observacion: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const startEdit = (exp: Expediente) => {
    setFormData({
      numero: exp.numero,
      asunto: exp.asunto,
      areaServicio: exp.areaServicio.map(a => a.area),
      fechaInicio: exp.fechaInicio,
      fechaVencimiento: exp.fechaVencimiento,
      observacion: exp.observacion || ''
    });
    setEditingId(exp.id);
    setIsFormOpen(true);
  };

  const toggleCumplido = (id: string, areaName: string) => {
    const newExpedientes = expedientes.map(exp => {
      if (exp.id === id) {
        const updatedAreas = exp.areaServicio.map(a => {
          if (a.area === areaName) {
            const isNowCumplido = !a.cumplido;
            return {
              ...a,
              cumplido: isNowCumplido,
              fechaRespuesta: isNowCumplido ? new Date().toISOString().split('T')[0] : ''
            };
          }
          return a;
        });
        return { ...exp, areaServicio: updatedAreas };
      }
      return exp;
    });
    syncWithServer(newExpedientes);
  };

  const exportToExcel = () => {
    const dataToExport: any[] = [];
    
    expedientes.forEach(exp => {
      exp.areaServicio.forEach(areaItem => {
        dataToExport.push({
          'Nº Expediente': exp.numero,
          'Asunto': exp.asunto,
          'Área/Servicio': areaItem.area,
          'Fecha Inicio': exp.fechaInicio,
          'Fecha Vencimiento': exp.fechaVencimiento,
          'Fecha Respuesta': areaItem.fechaRespuesta || 'Pendiente',
          'Cumplido': areaItem.cumplido ? 'SÍ' : 'NO',
          'Estado General': calculateStatus(exp.fechaVencimiento),
          'Comentario / Observación': exp.observacion || ''
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expedientes');
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Reporte_Expedientes_USDT_${date}.xlsx`);
  };

  const deleteExpediente = (id: string) => {
    const newExpedientes = expedientes.filter(e => e.id !== id);
    syncWithServer(newExpedientes);
  };

  const filteredExpedientes = expedientes.filter(e => 
    e.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.asunto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const report: DailyReport = expedientes.reduce((acc, curr) => {
    const status = calculateStatus(curr.fechaVencimiento);
    const allCumplido = curr.areaServicio.every(a => a.cumplido);
    
    acc.total++;
    if (allCumplido || status === 'green') acc.alDia++;
    else if (status === 'amber') acc.proximos++;
    else acc.retrasados++;
    return acc;
  }, { total: 0, alDia: 0, proximos: 0, retrasados: 0 });

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] bg-[#E4E3E0] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] p-1.5 rounded">
              <ClipboardList className="w-5 h-5 text-[#E4E3E0]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Seguimiento de Expedientes - USDT</h1>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isConnecting ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : isConnecting ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'}`} />
              {isConnected ? `En Línea (${transportType})` : isConnecting ? 'Conectando...' : useRestFallback ? 'Modo Seguro (REST)' : 'Desconectado'}
              {connectionError && !isConnected && (
                <span className="ml-1 text-[7px] opacity-70 lowercase">({connectionError})</span>
              )}
              {!isConnected && (
                <button 
                  onClick={connectSocket}
                  className="ml-1 underline cursor-pointer hover:text-rose-900"
                >
                  Reintentar
                </button>
              )}
            </div>
            <button 
              onClick={copyAppLink}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Copiar enlace para otros usuarios"
            >
              <FileText className="w-3 h-3 opacity-50" />
            </button>
            <div className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded border border-[#141414]/10">
              <span className="text-[8px] font-bold opacity-50 uppercase">Nube:</span>
              <span className="text-[8px] font-mono font-bold">{serverDataCount !== null ? serverDataCount : '?'}</span>
            </div>
            <button 
              onClick={uploadLocalToServer}
              className="p-1 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors"
              title="Subir datos locales a la nube"
            >
              <Download className="w-3 h-3 rotate-180" />
            </button>
            <button 
              onClick={forceSync}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Forzar Sincronización"
            >
              <Clock className={`w-3 h-3 opacity-50 ${!isConnected ? 'text-rose-500' : ''}`} />
            </button>
            <span className="text-[8px] opacity-30 font-mono">v1.3</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-[#141414] text-[#E4E3E0] px-4 py-2 rounded-sm hover:bg-opacity-90 transition-all active:scale-95 font-medium text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              NUEVO EXPEDIENTE
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 border border-[#141414] text-[#141414] px-4 py-2 rounded-sm hover:bg-[#141414] hover:text-[#E4E3E0] transition-all active:scale-95 font-medium text-sm cursor-pointer"
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
              EXCEL
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Daily Report Summary */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <LayoutDashboard className="w-5 h-5" />
            <h2 className="text-xs font-bold tracking-widest uppercase opacity-50">Reporte Diario de Situación</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[#141414] border border-[#141414]">
            <ReportCard 
              label="Total Expedientes" 
              value={report.total} 
              icon={<FileText className="w-5 h-5" />}
            />
            <ReportCard 
              label="Vigentes" 
              value={report.alDia} 
              color="text-emerald-600"
              icon={<CheckCircle2 className="w-5 h-5" />}
            />
            <ReportCard 
              label="Próximos / Hoy" 
              value={report.proximos} 
              color="text-amber-600"
              icon={<Clock className="w-5 h-5" />}
            />
            <ReportCard 
              label="Vencidos" 
              value={report.retrasados} 
              color="text-rose-600"
              icon={<AlertCircle className="w-5 h-5" />}
            />
          </div>
        </section>

        {/* Search and List */}
        <section>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              <h2 className="text-xs font-bold tracking-widest uppercase opacity-50">Listado de Expedientes</h2>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type="text" 
                placeholder="Buscar expediente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border border-[#141414] pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
              />
            </div>
          </div>

          <div className="border border-[#141414] bg-white overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[100px_1fr_1.2fr_100px_80px_80px_80px_1.2fr_40px] bg-[#141414] text-[#E4E3E0] text-[10px] font-bold tracking-widest uppercase p-4 gap-4">
              <div>Nº Expediente</div>
              <div>Asunto</div>
              <div>Área / Servicio</div>
              <div>Cumplido</div>
              <div>Inicio</div>
              <div>Vencimiento</div>
              <div>Estado</div>
              <div>Comentario / Observación</div>
              <div className="text-right"></div>
            </div>

            <div className="divide-y divide-[#141414]">
              <AnimatePresence mode="popLayout">
                {filteredExpedientes.length > 0 ? (
                  filteredExpedientes.map((exp) => (
                    <ExpedienteRow 
                      key={exp.id} 
                      exp={exp} 
                      onDelete={() => deleteExpediente(exp.id)} 
                      onEdit={() => startEdit(exp)}
                      onToggleCumplido={toggleCumplido}
                    />
                  ))
                ) : (
                  <div className="p-12 text-center opacity-40 italic font-serif">
                    No se encontraron expedientes registrados.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-[#141414]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#E4E3E0] border border-[#141414] shadow-2xl overflow-hidden"
            >
              <div className="bg-[#141414] p-4 flex items-center justify-between">
                <h3 className="text-[#E4E3E0] text-xs font-bold tracking-widest uppercase">
                  {editingId ? 'Editar Registro' : 'Nuevo Registro'}
                </h3>
                <button onClick={resetForm} className="text-[#E4E3E0] opacity-50 hover:opacity-100 cursor-pointer">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Número de Expediente</label>
                    <input 
                      required
                      type="text" 
                      value={formData.numero}
                      onChange={e => setFormData({...formData, numero: e.target.value})}
                      className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none"
                      placeholder="EXP-2026-001"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Área / Servicio (Selección Múltiple)</label>
                    <div className="w-full bg-white border border-[#141414] h-32 overflow-y-auto p-1">
                      {AREAS_SERVICIOS.map((area) => (
                        <label key={area} className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer text-[10px]">
                          <input 
                            type="checkbox"
                            checked={formData.areaServicio.includes(area)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                areaServicio: checked 
                                  ? [...prev.areaServicio, area]
                                  : prev.areaServicio.filter(a => a !== area)
                              }));
                            }}
                            className="w-3 h-3 accent-[#141414]"
                          />
                          <span className="truncate">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Asunto (Título)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.asunto}
                    onChange={e => setFormData({...formData, asunto: e.target.value})}
                    className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none"
                    placeholder="Descripción breve del trámite"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Inicio</label>
                    <input 
                      required
                      type="date" 
                      value={formData.fechaInicio}
                      onChange={e => setFormData({...formData, fechaInicio: e.target.value})}
                      className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Vencimiento</label>
                    <input 
                      required
                      type="date" 
                      value={formData.fechaVencimiento}
                      onChange={e => setFormData({...formData, fechaVencimiento: e.target.value})}
                      className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Comentario / Observación</label>
                  <textarea 
                    value={formData.observacion}
                    onChange={e => setFormData({...formData, observacion: e.target.value})}
                    className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none min-h-[80px]"
                    placeholder="Notas adicionales..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-xs font-bold tracking-widest uppercase hover:bg-opacity-90 transition-all mt-4 cursor-pointer"
                >
                  {editingId ? 'Actualizar Expediente' : 'Registrar Expediente'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

