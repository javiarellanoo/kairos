import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ArrowLeft, 
  Shield,
  Activity,
  AlertTriangle,
  X,
  Menu,
  Users,
  Tags,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/tw';

interface UsuarioAdmin {
  id: number;
  email: string;
  name: string;
  rol: 'paciente' | 'doctor' | 'admin';
  phone?: string;
  dni?: string;
  birth_date?: string;
  tarjeta_sanitaria?: string;
  especialidad?: string;
  consulta?: string;
  duracion_cita?: number;
  password?: string;
}

export const UsuariosAdmin = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('todos');

  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null);
  const [usuarioEliminando, setUsuarioEliminando] = useState<UsuarioAdmin | null>(null);

  useEffect(() => {
    document.title = "Gestión de Usuarios - Kairós Admin";
    
    const fetchUsuarios = async () => {
      try {
        const response = await apiClient.get('/admin/usuarios');
        setUsuarios(response.data);
      } catch (error) {
        console.error("Error al cargar usuarios", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  useEffect(() => {
    if (usuarioEditando) document.getElementById('modal-editar-titulo')?.focus();
  }, [usuarioEditando?.id]);

  useEffect(() => {
    if (usuarioEliminando) document.getElementById('modal-eliminar-titulo')?.focus();
  }, [usuarioEliminando?.id]);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(user => {
      const coincideRol = filtroRol === 'todos' || user.rol === filtroRol;
      const busquedaLower = busqueda.toLowerCase();
      const coincideBusqueda = 
        user.name.toLowerCase().includes(busquedaLower) || 
        user.email.toLowerCase().includes(busquedaLower);
      
      return coincideRol && coincideBusqueda;
    });
  }, [usuarios, busqueda, filtroRol]);

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    
    setAccionLoading('editar');
    
    const payload = { ...usuarioEditando };
    if (!payload.password) {
      delete payload.password;
    }

    try {
      if (usuarioEditando.rol === 'doctor') {
        await apiClient.put(`/admin/doctors/${usuarioEditando.id}`, payload);
      } else if (usuarioEditando.rol === 'paciente') {
        await apiClient.put(`/admin/pacientes/${usuarioEditando.id}`, payload);
      } else {
        alert("Rol no soportado para edición.");
        setAccionLoading(null);
        return;
      }
      setUsuarios(prev => prev.map(u => u.id === usuarioEditando.id ? usuarioEditando : u));
      setUsuarioEditando(null);
      alert("Usuario actualizado correctamente.");
    } catch (err) {
      alert("Error al actualizar el usuario.");
    } finally {
      setAccionLoading(null);
    }
  };

  const handleEliminar = async () => {
    if (!usuarioEliminando) return;
    
    setAccionLoading('eliminar');
    try {
      await apiClient.delete(`/admin/usuarios/${usuarioEliminando.id}`);
      setUsuarios(prev => prev.filter(u => u.id !== usuarioEliminando.id));
      setUsuarioEliminando(null);
    } catch (err) {
      alert("Error al eliminar el usuario del sistema.");
    } finally {
      setAccionLoading(null);
    }
  };

  const formatearRol = (rol: string) => {
    const roles: Record<string, string> = {
      'paciente': 'Paciente',
      'doctor': 'Médico',
    };
    return roles[rol] || rol;
  };

  const getEstilosRol = (rol: string) => {
    switch (rol) {
      case 'doctor': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Sidebar Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-accent/50 backdrop-blur-sm z-20 md:hidden"
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
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
          <button onClick={() => navigate('/admin/home')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <Shield className="w-5 h-5" /> Panel Principal
          </button>
            <button 
            onClick={() => navigate('/admin/usuarios')}
            className="w-full flex items-center gap-3 px-4 py-3  bg-teal-500/10 text-teal-400 rounded-xl font-medium transition-colors"
          >
            <Users className="w-5 h-5" /> Gestión de Usuarios
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main id="contenido-principal" tabIndex={-1} className="flex-1 flex flex-col h-screen overflow-y-auto outline-none">
        
        <header className="px-4 md:px-8 py-4 md:py-6 bg-white border-b border-slate-200 flex items-center gap-4 sticky top-0 z-10">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label='Abrir menú de navegación'
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button 
            onClick={() => navigate('/admin/home')}
            aria-label="Volver al panel principal"
            className="hidden md:block p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-accent leading-tight">Directorio de Usuarios</h2>
            <p className="text-slate-500 text-sm mt-1">Busca, edita o da de baja cuentas del sistema.</p>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          
          <section className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4" aria-label="Filtros de usuarios">
            <div className="flex-1 relative">
              <label htmlFor="buscarUsuario" className="sr-only">Buscar por nombre o email</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                id="buscarUsuario"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo electrónico..."
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-shadow"
              />
            </div>
            <div className="w-full sm:w-64 relative">
              <label htmlFor="filtroRol" className="sr-only">Filtrar por rol</label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-slate-400" aria-hidden="true" />
              </div>
              <select
                id="filtroRol"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none appearance-none bg-white"
              >
                <option value="todos">Todos los roles</option>
                <option value="paciente">Pacientes</option>
                <option value="doctor">Médicos</option>
              </select>
            </div>
          </section>

          <div className="sr-only" aria-live="polite">
            {isLoading ? "Cargando directorio de usuarios." : `Mostrando ${usuariosFiltrados.length} usuarios.`}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-accent border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-bold">Usuario</th>
                    <th scope="col" className="px-6 py-4 font-bold">Rol en Sistema</th>
                    <th scope="col" className="px-6 py-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                        No se encontraron usuarios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold" aria-hidden="true">
                              {usuario.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-accent">{usuario.name}</p>
                              <p className="text-xs text-slate-500">{usuario.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex", getEstilosRol(usuario.rol))}>
                            {formatearRol(usuario.rol)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          <button 
                            onClick={() => setUsuarioEditando({...usuario})}
                            aria-label={`Editar información de ${usuario.name}`}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary inline-flex"
                          >
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button 
                            onClick={() => setUsuarioEliminando(usuario)}
                            aria-label={`Dar de baja a ${usuario.name}`}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 inline-flex"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ================= MODALES ================= */}

      {/* MODAL: Editar Usuario */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-accent/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-editar-titulo">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 id="modal-editar-titulo" tabIndex={-1} className="text-lg font-bold text-accent flex items-center gap-2 outline-none">
                <Edit2 className="w-5 h-5 text-primary" aria-hidden="true"/> Editar Usuario
              </h3>
              <button onClick={() => setUsuarioEditando(null)} aria-label="Cerrar ventana sin guardar" className="p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            
            <form onSubmit={handleEditar} className="p-5 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  id="edit-name" 
                  required 
                  value={usuarioEditando.name} 
                  onChange={e => setUsuarioEditando({...usuarioEditando, name: e.target.value})} 
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <input 
                  id="edit-email" 
                  type="email" 
                  required 
                  value={usuarioEditando.email} 
                  onChange={e => setUsuarioEditando({...usuarioEditando, email: e.target.value})} 
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>

              {usuarioEditando.rol === 'doctor' && (
                <>
                  <div>
                    <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input 
                      id="edit-phone" 
                      value={usuarioEditando.phone || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, phone: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-consulta" className="block text-sm font-medium text-slate-700 mb-1">Consulta</label>
                    <input 
                      id="edit-consulta" 
                      value={usuarioEditando.consulta || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, consulta: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-duracion-cita" className="block text-sm font-medium text-slate-700 mb-1">Duración Cita (minutos)</label>
                    <input 
                      id="edit-duracion-cita" 
                      type="number"
                      value={usuarioEditando.duracion_cita || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, duracion_cita: parseInt(e.target.value) || 0})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-password" className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña (Opcional)</label>
                    <input 
                      id="edit-password" 
                      type="password"
                      value={usuarioEditando.password || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, password: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </>
              )}

              {usuarioEditando.rol === 'paciente' && (
                <>
                  <div>
                    <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input 
                      id="edit-phone" 
                      value={usuarioEditando.phone || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, phone: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-dni" className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
                    <input 
                      id="edit-dni" 
                      value={usuarioEditando.dni || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, dni: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-birth-date" className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
                    <input 
                      id="edit-birth-date" 
                      type="date"
                      value={usuarioEditando.birth_date || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, birth_date: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-tarjeta-sanitaria" className="block text-sm font-medium text-slate-700 mb-1">Tarjeta Sanitaria</label>
                    <input 
                      id="edit-tarjeta-sanitaria" 
                      value={usuarioEditando.tarjeta_sanitaria || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, tarjeta_sanitaria: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-password" className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña (Opcional)</label>
                    <input 
                      id="edit-password" 
                      type="password"
                      value={usuarioEditando.password || ''} 
                      onChange={e => setUsuarioEditando({...usuarioEditando, password: e.target.value})} 
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </>
              )}

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 mt-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-amber-900 leading-relaxed">Al guardar, los cambios se aplicarán inmediatamente. Si modificas el correo electrónico, notifica al usuario.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setUsuarioEditando(null)} className="flex-1">Cancelar</Button>
                <Button type="submit" variant="primary" aria-busy={accionLoading === 'editar'} isLoading={accionLoading === 'editar'} className="flex-1 bg-primary hover:bg-blue-700 text-white border-transparent focus:ring-primary">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {usuarioEliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-accent/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-eliminar-titulo" aria-describedby="modal-eliminar-desc">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" aria-hidden="true" />
            </div>
            <h3 id="modal-eliminar-titulo" tabIndex={-1} className="text-xl font-bold text-accent mb-2 outline-none">
              ¿Dar de baja usuario?
            </h3>
            <p id="modal-eliminar-desc" className="text-slate-500 text-sm mb-6">
              Estás a punto de eliminar permanentemente a <strong>{usuarioEliminando.name}</strong> del sistema Kairós. Esta acción borrará sus accesos y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setUsuarioEliminando(null)} variant="outline" className="flex-1">Cancelar</Button>
              <Button 
                onClick={handleEliminar} 
                variant="primary" 
                aria-busy={accionLoading === 'eliminar'}
                isLoading={accionLoading === 'eliminar'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent focus:ring-red-500"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};