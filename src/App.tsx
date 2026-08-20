import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth/AuthProvider';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
            <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/scan" replace />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
}
