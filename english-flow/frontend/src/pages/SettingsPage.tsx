import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Input, PageTitle, cx } from '../components/ui';

const TIMES = [5, 10, 15, 20, 30];
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
const METHODS = [
  'translation',
  'phrase_cards',
  'ai_speaking',
  'short_dialogues',
  'listening',
  'grammar_explanations',
  'professional_topics',
];
const NOTIFICATIONS = [
  { id: 'dailyLesson', key: 'notifyLesson' },
  { id: 'reviewDue', key: 'notifyReview' },
  { id: 'weeklySummary', key: 'notifyWeekly' },
  { id: 'missedStudy', key: 'notifyMissed' },
] as const;

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [minutes, setMinutes] = useState(user?.dailyGoalMinutes ?? 15);
  const [goals, setGoals] = useState<string[]>(user?.goals ?? []);
  const [methods, setMethods] = useState<string[]>(user?.preferredLearningMethods ?? []);
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    (user?.notificationSettings as Record<string, boolean>) ?? {
      dailyLesson: true,
      reviewDue: true,
      weeklySummary: true,
      missedStudy: false,
    },
  );
  const [reminderTime, setReminderTime] = useState(user?.reminderTime ?? '19:00');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch('/users/me', {
        name,
        dailyGoalMinutes: minutes,
        goals,
        preferredLearningMethods: methods,
        notificationSettings: notifications,
        reminderTime,
      });
      await refreshUser();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t('settings.title')}</PageTitle>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('settings.profile')}</h2>
        <div>
          <label className="mb-1 block text-sm text-slate-500">{t('settings.name')}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-500">
            {t('settings.dailyGoal')}
          </label>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((time) => (
              <button
                key={time}
                onClick={() => setMinutes(time)}
                className={cx(
                  'rounded-xl border px-3 py-2 text-sm font-medium cursor-pointer',
                  minutes === time
                    ? 'border-brand-700 bg-brand-800 text-white'
                    : 'border-slate-300 bg-white text-slate-600',
                )}
              >
                {time} {t('app.minutes_short')}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {t('settings.timezone')}: {user?.timezone}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('settings.goals')}</h2>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal}
              onClick={() => toggle(goals, setGoals, goal)}
              className={cx(
                'rounded-xl border px-3 py-1.5 text-sm cursor-pointer',
                goals.includes(goal)
                  ? 'border-brand-700 bg-brand-800 text-white'
                  : 'border-slate-300 bg-white text-slate-600',
              )}
            >
              {t(`onboarding.goals.${goal}`)}
            </button>
          ))}
        </div>
        <h2 className="pt-2 font-semibold">{t('settings.methods')}</h2>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((method) => (
            <button
              key={method}
              onClick={() => toggle(methods, setMethods, method)}
              className={cx(
                'rounded-xl border px-3 py-1.5 text-sm cursor-pointer',
                methods.includes(method)
                  ? 'border-brand-700 bg-brand-800 text-white'
                  : 'border-slate-300 bg-white text-slate-600',
              )}
            >
              {t(`onboarding.methods.${method}`)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('settings.notifications')}</h2>
        {NOTIFICATIONS.map((notification) => (
          <label
            key={notification.id}
            className="flex cursor-pointer items-center justify-between gap-3"
          >
            <span className="text-[15px]">{t(`settings.${notification.key}`)}</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-700"
              checked={notifications[notification.id] ?? false}
              onChange={(e) =>
                setNotifications({ ...notifications, [notification.id]: e.target.checked })
              }
            />
          </label>
        ))}
        <div>
          <label className="mb-1 block text-sm text-slate-500">
            {t('settings.reminderTime')}
          </label>
          <Input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="max-w-40"
          />
        </div>
        <p className="text-xs text-slate-400">{t('settings.notificationsHint')}</p>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {t('app.save')}
        </Button>
        {saved && <span className="text-sm text-emerald-700">✓ {t('settings.saved')}</span>}
      </div>

      <Link to="/diagnostic" className="block text-sm text-brand-700 hover:underline">
        {t('settings.retakeDiagnostic')} →
      </Link>
    </div>
  );
}
