import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { MainLayout } from './layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RiskRegisterPage } from './pages/risks/RiskRegisterPage';
import { RiskCardPage } from './pages/risks/RiskCardPage';
import { RiskLibraryPage } from './pages/RiskLibraryPage';
import { SourcesPage } from './pages/SourcesPage';
import { ControlsPage } from './pages/ControlsPage';
import { ActionPlansPage } from './pages/ActionPlansPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdministrationPage } from './pages/administration/AdministrationPage';
import { AnalysesListPage } from './pages/analyses/AnalysesListPage';
import { AnalysisWizardPage } from './pages/analyses/AnalysisWizardPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analyses" element={<AnalysesListPage />} />
          <Route path="/analyses/:id" element={<AnalysisWizardPage />} />
          <Route path="/risks" element={<RiskRegisterPage />} />
          <Route path="/risks/:id" element={<RiskCardPage />} />
          <Route path="/risk-library" element={<RiskLibraryPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/actions" element={<ActionPlansPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/administration/*" element={<AdministrationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
