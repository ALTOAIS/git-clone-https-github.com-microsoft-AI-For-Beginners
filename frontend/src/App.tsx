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
import { AcademyDashboardPage } from './pages/academy/AcademyDashboardPage';
import { MyAcademyPage } from './pages/academy/MyAcademyPage';
import { CoursesListPage } from './pages/academy/CoursesListPage';
import { CourseEditorPage } from './pages/academy/CourseEditorPage';
import { AcademyCalendarPage } from './pages/academy/AcademyCalendarPage';
import { TrainingMatrixPage } from './pages/academy/TrainingMatrixPage';
import { TakeTestPage } from './pages/academy/TakeTestPage';
import { SurveysListPage } from './pages/academy/SurveysListPage';
import { SurveyEditorPage } from './pages/academy/SurveyEditorPage';
import { RespondSurveyPage } from './pages/academy/RespondSurveyPage';
import { SurveyResultsPage } from './pages/academy/SurveyResultsPage';
import { CampaignsListPage } from './pages/academy/CampaignsListPage';
import { CampaignDetailPage } from './pages/academy/CampaignDetailPage';
import { TrainingPlanPage } from './pages/academy/TrainingPlanPage';
import { CertificatesPage } from './pages/academy/CertificatesPage';
import { AiAssistantPage } from './pages/ai/AiAssistantPage';

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
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/academy" element={<AcademyDashboardPage />} />
          <Route path="/academy/my" element={<MyAcademyPage />} />
          <Route path="/academy/courses" element={<CoursesListPage />} />
          <Route path="/academy/courses/:id" element={<CourseEditorPage />} />
          <Route path="/academy/calendar" element={<AcademyCalendarPage />} />
          <Route path="/academy/matrix" element={<TrainingMatrixPage />} />
          <Route path="/academy/take-test/:courseId" element={<TakeTestPage />} />
          <Route path="/academy/surveys" element={<SurveysListPage />} />
          <Route path="/academy/surveys/:id" element={<SurveyEditorPage />} />
          <Route path="/academy/surveys/:id/respond" element={<RespondSurveyPage />} />
          <Route path="/academy/surveys/:id/results" element={<SurveyResultsPage />} />
          <Route path="/academy/campaigns" element={<CampaignsListPage />} />
          <Route path="/academy/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/academy/training-plan" element={<TrainingPlanPage />} />
          <Route path="/academy/certificates" element={<CertificatesPage />} />
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
