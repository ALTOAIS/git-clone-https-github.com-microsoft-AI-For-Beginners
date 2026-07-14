import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, ProgressBar, cx } from '../components/ui';

const GOALS = [
  'speak_freely',
  'work_english',
  'professional_english',
  'travel',
  'professional_reading',
  'study_abroad',
  'interview',
  'business_writing',
  'career',
];
const PRESELECTED_GOALS = [
  'speak_freely',
  'professional_english',
  'study_abroad',
  'professional_reading',
  'career',
];
const SKILLS = ['vocabulary', 'grammar', 'listening', 'speaking', 'reading', 'writing'];
const METHODS = [
  'translation',
  'phrase_cards',
  'ai_speaking',
  'short_dialogues',
  'listening',
  'grammar_explanations',
  'professional_topics',
];
const PRESELECTED_METHODS = [
  'translation',
  'ai_speaking',
  'short_dialogues',
  'professional_topics',
];
const TIMES = [5, 10, 15, 20, 30];
const INTERESTS = [
  'compliance',
  'anticorruption',
  'governance',
  'management',
  'career',
  'travel',
  'family',
  'books',
  'technology',
  'sport',
  'entertainment',
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-xl border px-3.5 py-2.5 text-[15px] font-medium transition-colors cursor-pointer',
        active
          ? 'border-brand-700 bg-brand-800 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400',
      )}
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>(PRESELECTED_GOALS);
  const [confidence, setConfidence] = useState<Record<string, number>>(
    Object.fromEntries(SKILLS.map((s) => [s, 2])),
  );
  const [methods, setMethods] = useState<string[]>(PRESELECTED_METHODS);
  const [minutes, setMinutes] = useState(15);
  const [interests, setInterests] = useState<string[]>(['compliance', 'anticorruption', 'governance', 'career']);
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const saveProfile = async (completed: boolean) => {
    setSaving(true);
    try {
      await api.patch('/users/me', {
        goals,
        selfAssessment: confidence,
        preferredLearningMethods: methods,
        dailyGoalMinutes: minutes,
        preferredTopics: interests,
        onboardingCompleted: completed,
      });
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    // Шаг 1. Приветствие
    <div key="welcome" className="space-y-5 text-center">
      <img src="/icons/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl" />
      <h1 className="text-2xl font-bold">{t('onboarding.welcomeTitle')}</h1>
      <p className="text-slate-600">{t('onboarding.welcomeText')}</p>
      <Button onClick={() => setStep(1)} className="w-full">
        {t('onboarding.start')}
      </Button>
    </div>,
    // Шаг 2. Цели
    <div key="goals" className="space-y-4">
      <h2 className="text-xl font-bold">{t('onboarding.goalsTitle')}</h2>
      <p className="text-sm text-slate-500">{t('onboarding.goalsHint')}</p>
      <div className="flex flex-wrap gap-2">
        {GOALS.map((goal) => (
          <Chip
            key={goal}
            active={goals.includes(goal)}
            onClick={() => toggle(goals, setGoals, goal)}
          >
            {t(`onboarding.goals.${goal}`)}
          </Chip>
        ))}
      </div>
    </div>,
    // Шаг 3. Уверенность по навыкам
    <div key="confidence" className="space-y-4">
      <h2 className="text-xl font-bold">{t('onboarding.confidenceTitle')}</h2>
      <p className="text-sm text-slate-500">{t('onboarding.confidenceHint')}</p>
      <div className="space-y-3">
        {SKILLS.map((skill) => (
          <div key={skill} className="flex items-center justify-between gap-3">
            <span className="text-[15px]">{t(`onboarding.skills.${skill}`)}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setConfidence({ ...confidence, [skill]: n })}
                  className={cx(
                    'h-9 w-9 rounded-lg border text-sm font-medium cursor-pointer',
                    confidence[skill] >= n
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-slate-300 bg-white text-slate-500',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    // Шаг 4. Методы
    <div key="methods" className="space-y-4">
      <h2 className="text-xl font-bold">{t('onboarding.methodsTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {METHODS.map((method) => (
          <Chip
            key={method}
            active={methods.includes(method)}
            onClick={() => toggle(methods, setMethods, method)}
          >
            {t(`onboarding.methods.${method}`)}
          </Chip>
        ))}
      </div>
    </div>,
    // Шаг 5. Время в день
    <div key="time" className="space-y-4">
      <h2 className="text-xl font-bold">{t('onboarding.timeTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {TIMES.map((time) => (
          <Chip key={time} active={minutes === time} onClick={() => setMinutes(time)}>
            {time} {t('app.minutes_short')}
          </Chip>
        ))}
      </div>
    </div>,
    // Шаг 6. Интересы
    <div key="interests" className="space-y-4">
      <h2 className="text-xl font-bold">{t('onboarding.interestsTitle')}</h2>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => (
          <Chip
            key={interest}
            active={interests.includes(interest)}
            onClick={() => toggle(interests, setInterests, interest)}
          >
            {t(`onboarding.interests.${interest}`)}
          </Chip>
        ))}
      </div>
    </div>,
    // Шаг 7. Диагностика
    <div key="diagnostic" className="space-y-5 text-center">
      <h2 className="text-xl font-bold">{t('onboarding.diagnosticTitle')}</h2>
      <p className="text-slate-600">{t('onboarding.diagnosticText')}</p>
      <Button
        className="w-full"
        disabled={saving}
        onClick={async () => {
          await saveProfile(true);
          navigate('/diagnostic');
        }}
      >
        {t('onboarding.diagnosticStart')}
      </Button>
      <Button
        variant="ghost"
        className="w-full"
        disabled={saving}
        onClick={async () => {
          await saveProfile(true);
          navigate('/');
        }}
      >
        {t('onboarding.diagnosticLater')}
      </Button>
    </div>,
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-8">
      <Card className="w-full max-w-lg space-y-5 p-6">
        <ProgressBar value={((step + 1) / steps.length) * 100} />
        {steps[step]}
        {step > 0 && !isLast && (
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              {t('app.back')}
            </Button>
            <Button onClick={() => setStep(step + 1)}>{t('app.next')}</Button>
          </div>
        )}
        {isLast && step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            {t('app.back')}
          </Button>
        )}
      </Card>
    </div>
  );
}
