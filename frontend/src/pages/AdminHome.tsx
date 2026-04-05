import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Stethoscope, 
  LogOut, 
  Activity, 
  Menu,
  X,
  PlusCircle,
  Tags,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { cn } from '../utils/tw';
import { Button } from '../components/ui/Button';

export const AdminHome = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accionLoading, setAccionLoading] = useState<string | null>(null);

  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);

  const [doctorForm, setDoctorForm] = useState({ name: '', email: '', password: '', phone: '', especialidad: '', duracion_cita: 30, consulta: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [specialtyForm, setSpecialtyForm] = useState({ name: ''});

  const [especialidades, setEspecialidades] = useState<{nombre: string}[]>([]);

  const mockDateStr = import.meta.env.VITE_MOCK_CURRENT_DATE;
  const today = mockDateStr ? new Date(mockDateStr) : new Date();
  const fechaHoy = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today);

  useEffect(() => {
    document.title = "Panel de Control - Kairós Admin";
  }, []);

  useEffect(() => {
    if (isDoctorModalOpen) document.getElementById('modal-doctor-title')?.focus();
    if (isAdminModalOpen) document.getElementById('modal-admin-title')?.focus();
    if (isSpecialtyModalOpen) document.getElementById('modal-spec-title')?.focus();
  }, [isDoctorModalOpen, isAdminModalOpen, isSpecialtyModalOpen]);

  useEffect(() => {
    const initData = async () => {
      try {
        const res = await apiClient.get('/admin/especialidades');
        setEspecialidades(res.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccionLoading('doctor');
    try {
      await apiClient.post('/signup-doctor', doctorForm);
      setIsDoctorModalOpen(false);
      setDoctorForm({ name: '', email: '', password: '', phone: '', especialidad: '', duracion_cita: 30, consulta: '' });
      alert("Médico creado exitosamente en el sistema.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear médico.");
    } finally {
      setAccionLoading(null);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccionLoading('admin');
    try {
      await apiClient.post('/signup-admin', adminForm); 
      setIsAdminModalOpen(false);
      setAdminForm({ name: '', email: '', password: '', phone: '' });
      alert("Administrador creado exitosamente.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear administrador.");
    } finally {
      setAccionLoading(null);
    }
  };

  const handleCreateSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccionLoading('specialty');
    try {
      await apiClient.post('/especialidades', specialtyForm);
      setIsSpecialtyModalOpen(false);
      setSpecialtyForm({ name: '' });
      const res = await apiClient.get('/admin/especialidades');
      setEspecialidades(res.data);
      alert("Especialidad añadida al catálogo.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear especialidad.");
    } finally {
      setAccionLoading(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando panel de administración...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-accent/50 backdrop-blur-sm z-20 md:hidden"
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-64 bg-accent text-white flex flex-col flex-shrink-0 z-30 transition-transform duration-300 md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-white">
            <Activity className="w-6 h-6 text-teal-400" /> Kairós <span className="text-white font-light">ADMIN</span>
          </h1>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label='Cerrar menú de navegación'
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-teal-500/10 text-teal-400 rounded-xl font-medium transition-colors">
            <Shield className="w-5 h-5" /> Panel Principal
          </button>
          <button 
            onClick={() => navigate('/admin/usuarios')}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors"
          >
            <Users className="w-5 h-5" /> Gestión de Usuarios
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto" tabIndex={-1}>
        
        <header className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label='Abrir menú de navegación'
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 capitalize leading-tight">Panel de Control</h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 md:mt-1 capitalize">{fechaHoy}</p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
          
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-teal-600" aria-hidden="true" /> Acciones Rápidas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button 
              onClick={() => setIsDoctorModalOpen(true)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start gap-4 hover:border-teal-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 text-left group"
            >
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Stethoscope className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Alta de Médico</p>
                <p className="text-slate-500 text-sm mt-1">Registrar un nuevo profesional de la salud en el sistema.</p>
              </div>
            </button>

            <button 
              onClick={() => setIsAdminModalOpen(true)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start gap-4 hover:border-blue-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 text-left group"
            >
              <div className="p-3 bg-blue-50 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                <Shield className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Alta de Administrador</p>
                <p className="text-slate-500 text-sm mt-1">Crear credenciales para personal de gestión.</p>
              </div>
            </button>

            <button 
              onClick={() => setIsSpecialtyModalOpen(true)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-start gap-4 hover:border-purple-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 text-left group"
            >
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Tags className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Nueva Especialidad</p>
                <p className="text-slate-500 text-sm mt-1">Añadir una nueva rama médica al catálogo del hospital.</p>
              </div>
            </button>
          </div>

          {/* <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8 text-center flex flex-col items-center justify-center">
             <Building2 className="w-16 h-16 text-slate-200 mb-4" aria-hidden="true"/>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Estado del Sistema Kairós</h3>
             <p className="text-slate-500 max-w-lg">
               Todos los servicios y agentes se encuentran operando con normalidad. Utilice la barra lateral para acceder a la gestión detallada de los usuarios del sistema.
             </p>
          </div> */}

        </div>
      </main>

      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-doctor-title">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 id="modal-doctor-title" className="text-lg font-bold text-slate-900 flex items-center gap-2" tabIndex={-1}>
                <Stethoscope className="w-5 h-5 text-teal-600" aria-hidden="true"/> Registrar Médico
              </h3>
              <button onClick={() => setIsDoctorModalOpen(false)} aria-label="Cerrar ventana" className="p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateDoctor} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="doc-name" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                  <input id="doc-name" required value={doctorForm.name} onChange={e => setDoctorForm({...doctorForm, name: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                </div>
                <div>
                  <label htmlFor="doc-email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico *</label>
                  <input id="doc-email" type="email" required value={doctorForm.email} onChange={e => setDoctorForm({...doctorForm, email: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="doc-pass" className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal *</label>
                  <input id="doc-pass" type="password" required value={doctorForm.password} onChange={e => setDoctorForm({...doctorForm, password: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                </div>
                <div>
                  <label htmlFor="doc-phone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
                  <input id="doc-phone" required value={doctorForm.phone} onChange={e => setDoctorForm({...doctorForm, phone: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="doc-esp" className="block text-sm font-medium text-slate-700 mb-1">Especialidad *</label>
                  <select id="doc-esp" required value={doctorForm.especialidad} onChange={e => setDoctorForm({...doctorForm, especialidad: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                    <option value="" disabled>Seleccione...</option>
                    {especialidades.map((esp, i) => <option key={i} value={esp.nombre}>{esp.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="doc-consulta" className="block text-sm font-medium text-slate-700 mb-1">Sala / Consulta *</label>
                  <input id="doc-consulta" required placeholder="Ej. Sala 102" value={doctorForm.consulta} onChange={e => setDoctorForm({...doctorForm, consulta: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
              </div>
              <div>
                <label htmlFor="doc-dur" className="block text-sm font-medium text-slate-700 mb-1">Duración estándar de cita (minutos) *</label>
                <input id="doc-dur" type="number" min="5" required value={doctorForm.duracion_cita} onChange={e => setDoctorForm({...doctorForm, duracion_cita: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div className="pt-4 flex gap-3 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDoctorModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" variant="primary" aria-busy={accionLoading === 'doctor'} isLoading={accionLoading === 'doctor'} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white border-transparent">
                  Registrar Médico
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-admin-title">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 id="modal-admin-title" className="text-lg font-bold text-slate-900 flex items-center gap-2" tabIndex={-1}>
                <Shield className="w-5 h-5 text-primary" aria-hidden="true"/> Registrar Administrador
              </h3>
              <button onClick={() => setIsAdminModalOpen(false)} aria-label="Cerrar ventana" className="p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-5 space-y-4">
              <div>
                <label htmlFor="adm-name" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                <input id="adm-name" required value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label htmlFor="adm-email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico *</label>
                <input id="adm-email" type="email" required value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label htmlFor="adm-phone" className="block text-sm font-medium text-slate-700 mb-1">Número de Teléfono *</label>
                <input id="adm-phone" type="tel" required value={adminForm.phone} onChange={e => setAdminForm({...adminForm, phone: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label htmlFor="adm-pass" className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal *</label>
                <input id="adm-pass" type="password" required value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAdminModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" variant="primary" aria-busy={accionLoading === 'admin'} isLoading={accionLoading === 'admin'} className="flex-1 bg-primary hover:bg-blue-700 text-white border-transparent focus:ring-blue-500">
                  Crear Cuenta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSpecialtyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-spec-title">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 id="modal-spec-title" className="text-lg font-bold text-slate-900 flex items-center gap-2" tabIndex={-1}>
                <Tags className="w-5 h-5 text-purple-600" aria-hidden="true"/> Añadir Especialidad
              </h3>
              <button onClick={() => setIsSpecialtyModalOpen(false)} aria-label="Cerrar ventana" className="p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateSpecialty} className="p-5 space-y-4">
              <div>
                <label htmlFor="spec-name" className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Especialidad *</label>
                <input id="spec-name" required placeholder="Ej. Cardiología" value={specialtyForm.name} onChange={e => setSpecialtyForm({...specialtyForm, name: e.target.value})} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsSpecialtyModalOpen(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" variant="primary" aria-busy={accionLoading === 'specialty'} isLoading={accionLoading === 'specialty'} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border-transparent focus:ring-purple-500">
                  Añadir al Catálogo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};