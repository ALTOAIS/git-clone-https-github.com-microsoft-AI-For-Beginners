import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DailySummary } from '../api/types';
import { Card, Spinner } from './ui';

/**
 * Фактическая сводка дня — без геймификации (без "молодец", монет, анимаций).
 * Показывает только реальные цифры активности за сегодня.
 */
export default function DailySummaryCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => api.get<DailySummary>('/progress/daily-summary'),
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  const hasActivity =
    data.correctedErrorsToday > 0 ||
    data.reviewsCompletedToday > 0 ||
    data.speakingMinutesToday > 0 ||
    data.newPhrasesToday > 0 ||
    data.lessonsCompletedToday > 0;

  const stats: { label: string; value: number }[] = [
    { label: t('summary.reviewsCompleted'), value: data.reviewsCompletedToday },
    { label: t('summary.speakingMinutes'), value: data.speakingMinutesToday },
    { label: t('summary.correctedErrors'), value: data.correctedErrorsToday },
    { label: t('summary.newPhrases'), value: data.newPhrasesToday },
    { label: t('summary.lessonsCompleted'), value: data.lessonsCompletedToday },
  ];

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('summary.title')}</h2>
        {data.streakDays > 0 && (
          <span className="text-sm text-slate-500">
            {data.streakDays} {t('summary.streak')}
          </span>
        )}
      </div>

      {!hasActivity ? (
        <p className="text-sm text-slate-500">{t('summary.noActivity')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 p-3 text-center">
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-600">
        {data.dailyGoalMet ? t('summary.goalMet') : t('summary.goalNotMet')}
      </p>
      {data.speakingConfidenceNote && (
        <p className="text-sm text-slate-600">{data.speakingConfidenceNote}</p>
      )}
    </Card>
  );
}
