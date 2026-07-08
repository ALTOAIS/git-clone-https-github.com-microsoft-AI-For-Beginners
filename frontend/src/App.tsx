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
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { AdministrationPage } from './pages/administration/AdministrationPage';
import { AnalysesListPage } from './pages/analyses/AnalysesListPage';
import { AnalysisWizardPage } from './pages/analyses/AnalysisWizardPage';
import { AcademyLayout } from './pages/academy/AcademyLayout';
import { AcademyManagementPage } from './pages/academy/AcademyManagementPage';
import { TestsAndSurveysPage } from './pages/academy/TestsAndSurveysPage';
import { MyAcademyPage } from './pages/academy/MyAcademyPage';
import { CoursePlayerPage } from './pages/academy/CoursePlayerPage';
import { CoursesListPage } from './pages/academy/CoursesListPage';
import { CourseEditorPage } from './pages/academy/CourseEditorPage';
import { CoursePreviewPage } from './pages/academy/CoursePreviewPage';
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
          <Route path="/academy" element={<AcademyLayout />}>
            <Route index element={<Navigate to="/academy/my" replace />} />
            <Route path="my" element={<MyAcademyPage />} />
            <Route path="learn/:id" element={<CoursePlayerPage />} />
            <Route path="courses" element={<CoursesListPage />} />
            <Route path="courses/:id" element={<CourseEditorPage />} />
            <Route path="courses/:id/preview" element={<CoursePreviewPage />} />
            <Route path="tests" element={<TestsAndSurveysPage />} />
            <Route path="take-test/:courseId" element={<TakeTestPage />} />
            <Route path="surveys" element={<SurveysListPage />} />
            <Route path="surveys/:id" element={<SurveyEditorPage />} />
            <Route path="surveys/:id/respond" element={<RespondSurveyPage />} />
            <Route path="surveys/:id/results" element={<SurveyResultsPage />} />
            <Route path="management" element={<AcademyManagementPage />} />
            <Route path="calendar" element={<AcademyCalendarPage />} />
            <Route path="matrix" element={<TrainingMatrixPage />} />
            <Route path="campaigns" element={<CampaignsListPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="training-plan" element={<TrainingPlanPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
          </Route>
          <Route path="/risks" element={<RiskRegisterPage />} />
          <Route path="/risks/:id" element={<RiskCardPage />} />
          <Route path="/risk-library" element={<RiskLibraryPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/actions" element={<ActionPlansPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsAnalyticsPage />} />
          <Route path="/administration/*" element={<AdministrationPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
