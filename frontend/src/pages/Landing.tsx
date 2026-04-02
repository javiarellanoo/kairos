import { Activity, Bell, CalendarDays, Cog } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const Landing = () => {
    const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 font-sans selection:bg-blue-200">
      
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center gap-2 cursor-pointer shrink-0">
            <div className="rounded-lg bg-primary p-1 sm:p-1.5">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Kairós
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button 
              variant="ghost" 
              className="px-2 py-1.5 sm:px-4 text-sm font-medium text-slate-600 whitespace-nowrap"
                onClick={() => navigate('/login')}
            >
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Button>
            <Button 
              variant="primary" 
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm shadow-sm whitespace-nowrap"
              onClick={() => navigate('/register')}
            >
              Regístrate
            </Button>
          </div>
          
        </div>
      </header>

      <main className="relative mt-30 overflow-hidden bg-accent px-4 pb-16 pt-12 text-white sm:mt-35 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 aspect-square w-[60rem] rounded-full bg-accent/20 blur-3xl opacity-50"></div>
            <div className="absolute -bottom-1/2 right-0 aspect-square w-[40rem] rounded-full bg-accent/20 blur-3xl opacity-50"></div>
        </div>

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
            
            <div className="lg:col-span-6 text-center lg:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl text-balance leading-tight">
                Tu salud no entiende de esperas. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-300">Nosotros tampoco.</span>
              </h1>
              
              <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed text-balance">
                Olvídate de refrescar la pantalla. Mientras tú descansas, nosotros adelantamos tu cita.
              </p>
              
            </div>

            <div className="lg:col-span-6 mt-16 lg:mt-0">
              <div className="flex flex-col gap-4 sm:gap-6 max-w-md mx-auto lg:max-w-none relative">
                
                <article className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-primary group-hover:bg-primary/80 group-hover:text-white transition-colors duration-300">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Citas a tu medida</h3>
                    <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">Las citas se adaptan a tu disponibilidad horaria preferida.</p>
                  </div>
                </article>

                <article className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900 lg:ml-8">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-primary group-hover:bg-primary/80 group-hover:text-white transition-colors duration-300">
                    <Cog className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Gestión inteligente</h3>
                    <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">El sistema reacciona en milisegundos ante cualquier cancelación en el hospital.</p>
                  </div>
                </article>

                <article className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 sm:p-6 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-primary group-hover:bg-primary/80 group-hover:text-white transition-colors duration-300">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Alertas en tiempo real</h3>
                    <p className="mt-1 text-sm sm:text-base text-slate-400 leading-relaxed">Recibe notificaciones inmediatas con recordatorios y actualizaciones sobre tu cita.</p>
                  </div>
                </article>

              </div>
            </div>

          </div>
        </div>
      </main>
      <footer className="w-full border-t border-slate-200 bg-white py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="h-5 w-5" />
            <span className="font-semibold text-slate-500">Javier Arellano López</span>
          </div>
          <p className="text-sm text-slate-400">
            Trabajo de Fin de Grado - Universidad de Sevilla - 2026
          </p>
        </div>
      </footer>

    </div>
  );
};