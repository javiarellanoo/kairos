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
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
export default App
