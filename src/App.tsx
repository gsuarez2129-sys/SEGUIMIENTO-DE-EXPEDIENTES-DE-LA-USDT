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
  onToggleCumplido: (id: string) => void;
}

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
      className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_100px_100px_100px_80px_100px_1.5fr_40px] p-4 items-center gap-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="font-mono text-xs font-bold">{exp.numero}</div>
      <div className="font-serif italic text-sm truncate" title={exp.asunto}>{exp.asunto}</div>
      <div className="text-xs opacity-70">{exp.areaServicio}</div>
      <div className="text-[10px] opacity-60 flex flex-col">
        <span className="font-bold uppercase text-[8px]">Inicio</span>
        {formatDate(exp.fechaInicio)}
      </div>
      <div className="text-[10px] opacity-60 flex flex-col">
        <span className="font-bold uppercase text-[8px]">Venc.</span>
        {formatDate(exp.fechaVencimiento)}
      </div>
      <div className="text-[10px] opacity-60 flex flex-col">
        <span className="font-bold uppercase text-[8px]">Resp.</span>
        {exp.fechaRespuesta ? formatDate(exp.fechaRespuesta) : '-'}
      </div>
      <div className="flex justify-center">
        <input 
          type="checkbox" 
          checked={exp.cumplido || false} 
          onChange={() => onToggleCumplido(exp.id)}
          className="w-4 h-4 cursor-pointer accent-[#141414]"
          title="Marcar como cumplido"
        />
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
  
  // Form state
  const [formData, setFormData] = useState({
    numero: '',
    asunto: '',
    areaServicio: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    fechaRespuesta: '',
    cumplido: false,
    observacion: ''
  });

  // Load from local storage
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      setExpedientes(expedientes.map(exp => 
        exp.id === editingId ? { ...exp, ...formData } : exp
      ));
    } else {
      const newExpediente: Expediente = {
        id: crypto.randomUUID(),
        ...formData,
        createdAt: Date.now()
      };
      setExpedientes([newExpediente, ...expedientes]);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      numero: '',
      asunto: '',
      areaServicio: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      fechaRespuesta: '',
      cumplido: false,
      observacion: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const startEdit = (exp: Expediente) => {
    setFormData({
      numero: exp.numero,
      asunto: exp.asunto,
      areaServicio: exp.areaServicio,
      fechaInicio: exp.fechaInicio,
      fechaVencimiento: exp.fechaVencimiento,
      fechaRespuesta: exp.fechaRespuesta || '',
      cumplido: exp.cumplido || false,
      observacion: exp.observacion || ''
    });
    setEditingId(exp.id);
    setIsFormOpen(true);
  };

  const toggleCumplido = (id: string) => {
    setExpedientes(prev => prev.map(exp => {
      if (exp.id === id) {
        const isNowCumplido = !exp.cumplido;
        return {
          ...exp,
          cumplido: isNowCumplido,
          fechaRespuesta: isNowCumplido ? new Date().toISOString().split('T')[0] : ''
        };
      }
      return exp;
    }));
  };

  const exportToExcel = () => {
    const dataToExport = expedientes.map(exp => ({
      'Nº Expediente': exp.numero,
      'Asunto': exp.asunto,
      'Área/Servicio': exp.areaServicio,
      'Fecha Inicio': exp.fechaInicio,
      'Fecha Vencimiento': exp.fechaVencimiento,
      'Fecha Respuesta': exp.fechaRespuesta || 'N/A',
      'Cumplido': exp.cumplido ? 'SÍ' : 'NO',
      'Estado': calculateStatus(exp.fechaVencimiento),
      'Comentario / Observación': exp.observacion || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expedientes');
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Reporte_Expedientes_USDT_${date}.xlsx`);
  };

  const deleteExpediente = (id: string) => {
    setExpedientes(expedientes.filter(e => e.id !== id));
  };

  const filteredExpedientes = expedientes.filter(e => 
    e.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.asunto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const report: DailyReport = expedientes.reduce((acc, curr) => {
    const status = calculateStatus(curr.fechaVencimiento);
    acc.total++;
    if (status === 'green') acc.alDia++;
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
            <div className="hidden md:grid grid-cols-[100px_1fr_1fr_100px_100px_100px_80px_100px_1.5fr_40px] bg-[#141414] text-[#E4E3E0] text-[10px] font-bold tracking-widest uppercase p-4 gap-4">
              <div>Nº Expediente</div>
              <div>Asunto</div>
              <div>Área/Servicio</div>
              <div>Inicio</div>
              <div>Vencimiento</div>
              <div>Respuesta</div>
              <div className="text-center">Cumplido</div>
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
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Área / Servicio</label>
                    <input 
                      required
                      type="text" 
                      value={formData.areaServicio}
                      onChange={e => setFormData({...formData, areaServicio: e.target.value})}
                      className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none"
                      placeholder="Ej. Legal, RRHH"
                    />
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
                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest uppercase mb-1 opacity-50">Respuesta</label>
                    <input 
                      type="date" 
                      value={formData.fechaRespuesta}
                      onChange={e => setFormData({...formData, fechaRespuesta: e.target.value, cumplido: !!e.target.value})}
                      className="w-full bg-white border border-[#141414] p-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input 
                    type="checkbox" 
                    id="cumplido-form"
                    checked={formData.cumplido}
                    onChange={e => {
                      const isChecked = e.target.checked;
                      setFormData({
                        ...formData, 
                        cumplido: isChecked,
                        fechaRespuesta: isChecked ? new Date().toISOString().split('T')[0] : ''
                      });
                    }}
                    className="w-4 h-4 cursor-pointer accent-[#141414]"
                  />
                  <label htmlFor="cumplido-form" className="text-[10px] font-bold tracking-widest uppercase cursor-pointer">Marcar como Cumplido (Hoy)</label>
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

