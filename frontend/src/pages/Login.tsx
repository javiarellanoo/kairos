import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiClient } from '../api/client';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try{
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await apiClient.post('/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const token = response.data.access_token;
      const userRole = await login(token);
      
      if (userRole === 'paciente') {
        navigate('/home');
      } else if (userRole === 'doctor') {
        navigate('/medico/home');
      } else if (userRole === 'admin') {
        navigate('/admin/home');
      } else {
        navigate('/'); 
      }

    } catch (error: any) {
      console.error("Error en el login:", error);
      alert(error.response?.data?.detail || "Error al iniciar sesión. Revisa tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 font-sans sm:px-6 lg:px-8">
      
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <div className="mb-8 text-center">
            <div className="flex justify-center">
              <div className="rounded-xl bg-primary p-2 sm:p-3 shadow-lg shadow-blue-600/20">
                <Activity className="h-8 w-8 text-white" />
              </div>
            </div>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
              Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Aún no tienes cuenta?{' '}
              <button onClick={() => navigate('/register')} className="font-semibold text-primary transition-colors hover:text-cyan-500">
                Regístrate aquí
              </button>
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleLogin}>
            
            <Input
              id="email"
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.com"
              icon={<Mail className="h-5 w-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <Input
                id="password"
                type="password"
                label="Contraseña"
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex items-center justify-end mt-2">
                <a href="#" className="text-sm font-medium text-primary hover:text-cyan-500">
                  ¿Has olvidado tu contraseña?
                </a>
              </div>
            </div>

            <Button 
              type="submit" 
              variant="dark" 
              className="w-full py-3"
              isLoading={isLoading}
            >
              Iniciar sesión
            </Button>
            
          </form>

        </div>
      </div>
    </div>
  );
};