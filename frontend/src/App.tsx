import { useState } from 'react'
import './App.css'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { PacienteHome } from './pages/PacienteHome'
import { MisCitas } from './pages/MisCitas'
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CitaDetalle } from './pages/DetallesCita'
import { NuevaCita } from './pages/NuevaCita'
import { PerfilPaciente } from './pages/PerfilPaciente'
import { MedicoHome } from './pages/MedicoHome'
import { AbrirAgenda } from './pages/AbrirAgenda'
import { PerfilMedico } from './pages/PerfilMedico'
import { CitasMedico } from './pages/CitasMedico'
import { DetallesCitaMedico } from './pages/DetallesCitaMedico'


 function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path= "/home" element={
          <ProtectedRoute allowedRoles={['paciente']}>
            <PacienteHome />
          </ProtectedRoute>
        } />
        <Route path= "/mis-citas" element={
          <ProtectedRoute allowedRoles={['paciente']}>
            <MisCitas />
          </ProtectedRoute>
        } />
        <Route path="/citas/:id_cita" element={
          <ProtectedRoute allowedRoles={['paciente']}>
            <CitaDetalle />
          </ProtectedRoute>
        } />
        <Route path="/nueva-cita" element={
          <ProtectedRoute allowedRoles={['paciente']}>
            <NuevaCita />
          </ProtectedRoute>
        } />
        <Route path="/mi-perfil" element={
          <ProtectedRoute allowedRoles={['paciente']}>
            <PerfilPaciente />
          </ProtectedRoute>
        } />
        <Route path="/medico/home" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <MedicoHome />
          </ProtectedRoute>
         } />

          <Route path="/medico/abrir-agenda" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <AbrirAgenda />
          </ProtectedRoute>
        } />
          <Route path="/medico/perfil" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <PerfilMedico />
          </ProtectedRoute>
        } />

        <Route path="/medico/citas" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <CitasMedico />
          </ProtectedRoute>
        } />

        <Route path= "/medico/citas/:id_cita" element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DetallesCitaMedico />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
export default App
