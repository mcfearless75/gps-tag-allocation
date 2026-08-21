import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
