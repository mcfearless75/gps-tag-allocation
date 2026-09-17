import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { ScanPage } from './pages/ScanPage';
import { RosterPage } from './pages/RosterPage';
import { ReportPage } from './pages/ReportPage';
import { SheetPage } from './pages/SheetPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/sheet" element={<SheetPage />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
