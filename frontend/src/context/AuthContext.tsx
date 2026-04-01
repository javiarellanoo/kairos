// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

interface User {
  id: string;
  nombre: string;
  rol: 'paciente' | 'doctor' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {

          const response = await apiClient.get('/users/me'); 
          setUser(response.data);
        } catch (error) {
          console.error("Token inválido o caducado", error);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

    const login = async (token: string): Promise<string> => {
        localStorage.setItem('token', token);
        
        try {
        const response = await apiClient.get('/users/me', {
            headers: {
            Authorization: `Bearer ${token}`
            }
        });
        
        const userData = response.data;
        setUser(userData);
        return userData.rol;

        } catch (error) {
        console.error("Error al obtener los datos del usuario tras el login", error);
        localStorage.removeItem('token');
        throw new Error("No se pudo verificar la identidad del usuario");
        }
    };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};