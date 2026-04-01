import { useState } from 'react'
import './App.css'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { PacienteHome } from './pages/PacienteHome'
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

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
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
export default App
