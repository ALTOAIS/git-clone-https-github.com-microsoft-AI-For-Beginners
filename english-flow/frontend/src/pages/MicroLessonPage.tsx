import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { MicroLesson, MicroLessonResult } from '../api/types';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  PageTitle,
  Spinner,
  Textarea,
} from '../components/ui';

export default function MicroLessonPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MicroLessonResult | null>(null);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['micro-lesson', id],
    queryFn: () => api.get<MicroLesson>(`/micro-lessons/${id}`),
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      api.post<MicroLessonResult>(`/micro-lessons/${id}/complete`, {
        answers: Object.entries(answers).map(([exerciseId, answer]) => ({
          exerciseId,
          answer,
        })),
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['micro-lessons-eligible'] });
    },
  });

  if (isLoading || !lesson) return <Spinner />;

  return (
    <div className="space-y-4">
      <PageTitle>{t(`microLesson.categories.${lesson.category}`)}</PageTitle>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">{t('microLesson.rule')}</div>
          <AiModeBadge mode={lesson.aiMode ?? undefined} />
        </div>
        <p className="whitespace-pre-line text-[15px]">{lesson.content.ruleExplanation}</p>
      </Card>

      {lesson.userExamples.length > 0 && (
        <Card className="space-y-2">
          <div className="text-sm font-medium text-slate-500">{t('microLesson.yourExamples')}</div>
          {lesson.userExamples.map((ex, i) => (
            <div key={i} className="text-sm">
              <span className="text-red-600 line-through">{ex.original}</span>{' '}
              <span className="font-medium text-emerald-700">{ex.corrected}</span>
            </div>
          ))}
        </Card>
      )}

      {lesson.content.additionalExamples.length > 0 && (
        <Card className="space-y-1">
          <div className="text-sm font-medium text-slate-500">{t('microLesson.moreExamples')}</div>
          {lesson.content.additionalExamples.map((ex, i) => (
            <p key={i} className="text-sm">
              {ex}
            </p>
          ))}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="text-sm font-medium text-slate-500">{t('microLesson.exercisesTitle')}</div>
        {lesson.content.exercises.map((ex, i) => {
          const exResult = result?.results.find((r) => r.exerciseId === ex.id);
          return (
            <div key={ex.id} className="space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
              <div className="text-[15px]">
                {i + 1}.{' '}
                {ex.type === 'correct_sentence' ? (
                  <>
                    {t('microLesson.correctSentencePrompt')}: <span className="italic">{ex.prompt}</span>
                  </>
                ) : (
                  ex.prompt
                )}
              </div>
              {ex.type === 'choice' && ex.options ? (
                <div className="flex flex-wrap gap-2">
                  {ex.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={!!result}
                      onClick={() => setAnswers((prev) => ({ ...prev, [ex.id]: opt }))}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        answers[ex.id] === opt
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  rows={1}
                  disabled={!!result}
                  value={answers[ex.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                  placeholder={t('microLesson.yourAnswer') as string}
                />
              )}
              {exResult && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone={exResult.correct ? 'green' : 'red'}>
                    {exResult.correct ? '✓' : '✗'}
                  </Badge>
                  {!exResult.correct && (
                    <span className="text-slate-500">
                      {t('microLesson.correctAnswerLabel')}: {exResult.correctAnswer}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!result ? (
          <Button
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
          >
            {t('microLesson.checkAnswers')}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-slate-900">
              {t('microLesson.result', { score: result.score, total: result.total })}
            </p>
            <p className="text-sm text-slate-600">
              {result.score === result.total
                ? t('microLesson.resultGood')
                : t('microLesson.resultRetry')}
            </p>
            <Button variant="secondary" onClick={() => navigate('/')}>
              {t('microLesson.backToday')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
