import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AppLayout from './layout/AppLayout';
import { Spinner } from './components/ui';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DiagnosticPage from './pages/DiagnosticPage';
import TodayPage from './pages/TodayPage';
import LessonsPage from './pages/LessonsPage';
import LessonPlayerPage from './pages/LessonPlayerPage';
import TranslatePage from './pages/TranslatePage';
import ReviewPage from './pages/ReviewPage';
import PhrasesPage from './pages/PhrasesPage';
import SpeakingPage from './pages/SpeakingPage';
import ErrorsPage from './pages/ErrorsPage';
import MicroLessonPage from './pages/MicroLessonPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import GeneratorPage from './pages/GeneratorPage';
import MaterialsPage from './pages/MaterialsPage';
import MorePage from './pages/MorePage';
import GrammarPage from './pages/GrammarPage';
import GrammarRulePage from './pages/GrammarRulePage';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Первый вход: онбординг до основного приложения
  if (
    !user.onboardingCompleted &&
    !['/onboarding', '/diagnostic'].includes(location.pathname)
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/diagnostic" element={<DiagnosticPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/lessons" element={<LessonsPage />} />
        <Route path="/lessons/:id" element={<LessonPlayerPage />} />
        <Route path="/translate" element={<TranslatePage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/phrases" element={<PhrasesPage />} />
        <Route path="/speaking" element={<SpeakingPage />} />
        <Route path="/errors" element={<ErrorsPage />} />
        <Route path="/micro-lessons/:id" element={<MicroLessonPage />} />
        <Route path="/grammar" element={<GrammarPage />} />
        <Route path="/grammar/:ruleCode" element={<GrammarRulePage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/generator" element={<GeneratorPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
