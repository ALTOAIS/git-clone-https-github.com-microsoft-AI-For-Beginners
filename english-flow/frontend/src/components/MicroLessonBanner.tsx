import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { EligibleMicroLesson, MicroLesson } from '../api/types';
import { Button, Card } from './ui';

/**
 * Баннер адаптивных микро-уроков: показывается, когда одна и та же
 * ошибка повторяется у пользователя чаще порога за окно наблюдения.
 */
export default function MicroLessonBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissedCategories, setDismissedCategories] = useState<Set<string>>(new Set());

  const { data: eligible } = useQuery({
    queryKey: ['micro-lessons-eligible'],
    queryFn: () => api.get<EligibleMicroLesson[]>('/micro-lessons/eligible'),
  });

  const generateMutation = useMutation({
    mutationFn: (category: string) =>
      api.post<MicroLesson>('/micro-lessons/generate', { category }),
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: ['micro-lessons-eligible'] });
      navigate(`/micro-lessons/${lesson.id}`);
    },
  });

  const visible = eligible?.filter((e) => !dismissedCategories.has(e.category));
  if (!visible || visible.length === 0) return null;

  const top = visible[0];

  return (
    <Card className="space-y-3 border-amber-200 bg-amber-50">
      <div>
        <div className="text-sm font-medium text-amber-800">{t('microLesson.bannerTitle')}</div>
        <div className="text-base font-semibold text-slate-900">
          {t(`microLesson.categories.${top.category}`)}
        </div>
        <p className="text-sm text-slate-600">
          {t('microLesson.bannerCount', { count: top.count, days: top.lookbackDays })}
        </p>
      </div>
      {top.examples.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">{t('microLesson.yourExamples')}</div>
          {top.examples.slice(0, 2).map((ex, i) => (
            <div key={i} className="text-sm">
              <span className="text-red-600 line-through">{ex.original}</span>{' '}
              <span className="font-medium text-emerald-700">{ex.corrected}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate(top.category)}
        >
          {generateMutation.isPending ? t('microLesson.loading') : t('microLesson.start')}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            setDismissedCategories((prev) => new Set(prev).add(top.category))
          }
        >
          {t('microLesson.dismiss')}
        </Button>
      </div>
    </Card>
  );
}
