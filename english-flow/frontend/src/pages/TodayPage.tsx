import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DailyPlan, ErrorRecord, ProgressOverview, UserPhrase } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  Spinner,
  StatTile,
  cx,
  levelLabel,
} from '../components/ui';
import DailySummaryCard from '../components/DailySummaryCard';
import MicroLessonBanner from '../components/MicroLessonBanner';
import { speak } from '../lib/voice';

function taskLink(type: string, lessonId?: string): string {
  switch (type) {
    case 'review':
      return '/review';
    case 'lesson':
      return lessonId ? `/lessons/${lessonId}` : '/lessons';
    case 'speaking':
      return '/speaking';
    case 'voice':
      return '/speaking?scenario=daily-question';
    case 'errors':
      return '/errors';
    default:
      return '/';
  }
}

export default function TodayPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan-today'],
    queryFn: () => api.get<DailyPlan>('/plans/today'),
  });
  const { data: phraseOfDay } = useQuery({
    queryKey: ['phrase-of-day'],
    queryFn: () => api.get<UserPhrase | null>('/phrases/of-the-day'),
  });
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get<ProgressOverview>('/progress'),
  });
  const { data: errors } = useQuery({
    queryKey: ['errors-top'],
    queryFn: () => api.get<ErrorRecord[]>('/errors'),
  });

  const busyMutation = useMutation({
    mutationFn: () => api.post<DailyPlan>('/plans/today/busy'),
    onSuccess: (data) => queryClient.setQueryData(['plan-today'], data),
  });

  if (isLoading || !plan) return <Spinner />;

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('today.greetingMorning')
      : hour < 18
        ? t('today.greetingDay')
        : t('today.greetingEvening');

  const tasks = plan.tasksJson.tasks;
  const firstOpen = tasks.find((task) => !task.done);
  const topError = errors?.find((e) => e.status !== 'RESOLVED');

  return (
    <div className="space-y-4">
      {/* Шапка */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {user?.name}
          </h1>
          <p className="text-slate-500">
            {new Date().toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="blue">
            {t('today.level')} {levelLabel(user?.currentLevel ?? 'A2')}
          </Badge>
          <Badge tone="amber">
            🔥 {user?.streakDays ?? 0} {t('today.days')}
          </Badge>
        </div>
      </div>

      {/* Миссия дня */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('today.mission')}</h2>
          <span className="text-slate-500">
            {t('today.todayPlan', { minutes: plan.plannedMinutes })}
          </span>
        </div>
        <ProgressBar value={plan.completionPercent} />
        <ol className="space-y-2">
          {tasks.map((task, index) => (
            <li key={task.id}>
              <Link
                to={taskLink(task.type, task.lessonId)}
                className={cx(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                  task.done
                    ? 'border-emerald-200 bg-emerald-50 text-slate-400 line-through'
                    : 'border-slate-200 bg-white hover:border-brand-400',
                )}
              >
                <span
                  className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    task.done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-brand-100 text-brand-800',
                  )}
                >
                  {task.done ? '✓' : index + 1}
                </span>
                <span className="flex-1 text-[15px]">{task.title}</span>
                <span className="text-sm text-slate-400">
                  {task.minutes} {t('app.minutes_short')}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {plan.completionPercent === 100 ? (
          <p className="text-center font-medium text-emerald-700">
            {t('today.completed')}
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() =>
                navigate(firstOpen ? taskLink(firstOpen.type, firstOpen.lessonId) : '/review')
              }
            >
              {t('today.startSession')}
            </Button>
            {!plan.tasksJson.busy && (
              <Button
                variant="secondary"
                className="flex-1"
                disabled={busyMutation.isPending}
                onClick={() => busyMutation.mutate()}
              >
                {t('today.busyDay')}
              </Button>
            )}
          </div>
        )}
      </Card>

      <MicroLessonBanner />

      <DailySummaryCard />

      {/* Дополнительные карточки */}
      <div className="grid gap-3 sm:grid-cols-2">
        {phraseOfDay && (
          <Card className="space-y-1">
            <div className="text-sm text-slate-500">{t('today.phraseOfDay')}</div>
            <button
              className="text-left text-lg font-semibold text-brand-900 cursor-pointer hover:underline"
              onClick={() => speak(phraseOfDay.phrase.englishText)}
            >
              🔊 {phraseOfDay.phrase.englishText}
            </button>
            <div className="text-slate-600">{phraseOfDay.phrase.russianTranslation}</div>
          </Card>
        )}
        <StatTile
          label={t('today.weeklySpeaking')}
          value={`${progress?.speakingMinutesWeek ?? 0} ${t('app.minutes_short')}`}
        />
        {topError && (
          <Card className="space-y-1 sm:col-span-2">
            <div className="text-sm text-slate-500">{t('today.lastError')}</div>
            <div className="text-sm">
              <span className="text-red-600 line-through">{topError.originalText}</span>{' '}
              <span className="font-medium text-emerald-700">
                {topError.correctedText}
              </span>
            </div>
            <Link to="/errors" className="text-sm font-medium text-brand-700 hover:underline">
              {t('today.fixIt')} →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
