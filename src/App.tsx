import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth/AuthProvider';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';

function Nav() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <nav>
      <a href="/scan">Scan</a>
      <a href="/roster">Roster</a>
      <a href="/report">Report</a>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Nav />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
          <Route path="/roster" element={<ProtectedRoute><RosterPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
