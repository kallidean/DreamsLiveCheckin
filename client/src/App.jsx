import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyPage from './pages/VerifyPage';
import RepDashboard from './pages/RepDashboard';
import CheckInForm from './pages/CheckInForm';
import SupervisorDashboard from './pages/SupervisorDashboard';
import UserManagement from './pages/admin/UserManagement';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/" element={
              <ProtectedRoute roles={['rep', 'supervisor', 'admin']}>
                <RepDashboard />
              </ProtectedRoute>
            } />
            <Route path="/checkin/new" element={
              <ProtectedRoute roles={['rep', 'supervisor', 'admin']}>
                <CheckInForm />
              </ProtectedRoute>
            } />
            <Route path="/supervisor" element={
              <ProtectedRoute roles={['supervisor', 'admin']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
