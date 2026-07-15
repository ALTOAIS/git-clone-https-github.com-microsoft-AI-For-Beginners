import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  ReviewAnswerEvaluation,
  ReviewQueue,
  ReviewTask,
} from '../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageTitle,
  ProgressBar,
  Spinner,
  Textarea,
  cx,
} from '../components/ui';
import { ReviewFeedback } from '../components/ReviewFeedback';
import { VoiceRecorder } from '../components/VoiceRecorder';
import DailySummaryCard from '../components/DailySummaryCard';
import MicroLessonBanner from '../components/MicroLessonBanner';
import { postWithOfflineFallback, useOnline } from '../lib/offline';
import { speak } from '../lib/voice';

type SessionSize = 'short' | 'standard' | 'intensive';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'’«»()—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ReviewPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const online = useOnline();

  const [sessionSize, setSessionSize] = useState<SessionSize>('standard');
  const [started, setStarted] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['review-queue', sessionSize],
    queryFn: () =>
      api.get<ReviewQueue>(`/reviews/queue?session=${sessionSize}`),
    staleTime: 0,
  });

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [evaluation, setEvaluation] = useState<ReviewAnswerEvaluation | null>(
    null,
  );
  const [evaluating, setEvaluating] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const startedAtRef = useRef(Date.now());

  const tasks = data?.tasks ?? [];
  const task: ReviewTask | undefined = tasks[index];

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [index]);

  const resetItemState = () => {
    setAnswer('');
    setRevealed(false);
    setWasCorrect(null);
    setEvaluation(null);
    setSubmittedAnswer('');
  };

  if (isLoading) return <Spinner />;

  // --- Стартовый экран: размер сессии + сколько к повторению ---
  if (!started) {
    const due = data?.dueTotal ?? 0;
    if (due === 0) {
      return (
        <div className="space-y-4">
          <PageTitle>{t('review.title')}</PageTitle>
          <EmptyState>{t('review.nothingDue')}</EmptyState>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <PageTitle>{t('review.title')}</PageTitle>
        <Card className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-semibold">
              {t('review.dueToday', { count: due })}
            </div>
            <div className="text-slate-500">
              {t('review.currentSession', { count: data?.sessionSize ?? 0 })}
            </div>
            <div className="text-slate-500">
              {t('review.estTime', { minutes: data?.estimatedMinutes ?? 1 })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['short', 'standard', 'intensive'] as SessionSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setSessionSize(s)}
                className={cx(
                  'rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer',
                  sessionSize === s
                    ? 'border-brand-700 bg-brand-800 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400',
                )}
              >
                {t(`review.sessionSize.${s}`)}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={() => setStarted(true)}>
            {t('review.start')}
          </Button>
        </Card>
      </div>
    );
  }

  // --- Экран завершения блока ---
  if (!task) {
    const remaining = Math.max((data?.dueTotal ?? 0) - reviewedCount, 0);
    return (
      <div className="space-y-4">
        <PageTitle>{t('review.title')}</PageTitle>
        <Card className="space-y-3 text-center">
          <div className="text-3xl">✅</div>
          <h2 className="text-lg font-semibold text-emerald-700">
            {t('review.dailyGoalMet')}
          </h2>
          <p className="text-slate-600">{t('review.reviewed', { count: reviewedCount })}</p>
          {remaining > 0 && (
            <p className="text-slate-600">{t('review.remaining', { count: remaining })}</p>
          )}
          {queuedOffline && (
            <p className="text-sm text-amber-700">{t('review.offlineSaved')}</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {remaining > 0 && (
              <Button
                className="flex-1"
                onClick={async () => {
                  setIndex(0);
                  setReviewedCount(0);
                  resetItemState();
                  await queryClient.invalidateQueries({
                    queryKey: ['review-queue'],
                  });
                  await refetch();
                }}
              >
                {t('review.continue')}
              </Button>
            )}
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['plan-today'] });
                setStarted(false);
                setIndex(0);
                setReviewedCount(0);
                resetItemState();
              }}
            >
              {t('review.later')}
            </Button>
          </div>
        </Card>
        <MicroLessonBanner />
        <DailySummaryCard />
      </div>
    );
  }

  const isProduction =
    task.taskType === 'translation' ||
    task.taskType === 'sentence' ||
    task.taskType === 'voice';

  /** Проверка ответа: продуктивные задания → ИИ-оценка; узнавание → точное сравнение. */
  const evaluateAnswer = async (value: string, seconds?: number) => {
    setSubmittedAnswer(value);
    if (task.taskType === 'recognition') {
      setWasCorrect(value === task.russian);
      setRevealed(true);
      return;
    }
    // Продуктивное задание: ИИ-оценка (с офлайн-фолбэком на локальное сравнение).
    if (!online) {
      const ok = normalize(value) === normalize(task.english);
      setWasCorrect(ok);
      setRevealed(true);
      return;
    }
    setEvaluating(true);
    try {
      const result = await api.post<ReviewAnswerEvaluation>('/reviews/evaluate', {
        phraseId: task.phraseId,
        taskType: task.taskType,
        userAnswer: value,
        durationSec: seconds,
      });
      setEvaluation(result);
      setWasCorrect(result.accepted);
    } catch {
      // Сеть/ИИ недоступны — безопасный локальный вердикт.
      setWasCorrect(normalize(value) === normalize(task.english));
    } finally {
      setEvaluating(false);
      setRevealed(true);
    }
  };

  const submit = async (confidence: number) => {
    const correct = (wasCorrect ?? false) && confidence > 0;
    const { queued } = await postWithOfflineFallback('/reviews/attempt', {
      phraseId: task.phraseId,
      taskType: task.taskType,
      answer: submittedAnswer || answer || undefined,
      correct,
      confidence,
      responseTimeMs: Date.now() - startedAtRef.current,
    });
    if (queued) setQueuedOffline(true);
    setReviewedCount((n) => n + 1);
    setIndex(index + 1);
    resetItemState();
    if (index + 1 >= tasks.length && online) {
      try {
        await api.post('/plans/today/tasks/review/complete');
      } catch {
        /* нет задачи в плане */
      }
      queryClient.invalidateQueries({ queryKey: ['plan-today'] });
    }
  };

  const promptKey =
    task.taskType === 'recognition'
      ? 'review.recognitionPrompt'
      : task.taskType === 'translation'
        ? 'review.translationPrompt'
        : task.taskType === 'sentence'
          ? 'review.sentencePrompt'
          : 'review.voicePrompt';

  return (
    <div className="space-y-4">
      <PageTitle
        actions={
          <Badge tone="blue">
            {t('review.sessionProgress', {
              current: Math.min(index + 1, tasks.length),
              total: tasks.length,
            })}
          </Badge>
        }
      >
        {t('review.title')}
      </PageTitle>
      <ProgressBar value={(index / Math.max(tasks.length, 1)) * 100} />

      <Card className="space-y-4">
        <div className="text-sm text-slate-500">{t(promptKey)}</div>

        {task.taskType === 'recognition' && (
          <>
            <button
              className="text-2xl font-bold text-brand-900 cursor-pointer"
              onClick={() => speak(task.english)}
            >
              🔊 {task.english}
            </button>
            <div className="grid gap-2">
              {(task.options ?? []).map((option) => (
                <button
                  key={option}
                  disabled={revealed}
                  onClick={() => setAnswer(option)}
                  className={cx(
                    'rounded-xl border px-3.5 py-2.5 text-left cursor-pointer transition-colors',
                    answer === option
                      ? 'border-brand-700 bg-brand-50 font-medium'
                      : 'border-slate-200 bg-white hover:border-brand-300',
                    revealed &&
                      option === task.russian &&
                      'border-emerald-500 bg-emerald-50',
                    revealed &&
                      answer === option &&
                      option !== task.russian &&
                      'border-red-400 bg-red-50',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {task.taskType === 'translation' && (
          <>
            <div className="text-2xl font-bold">{task.russian}</div>
            {!revealed && (
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('translate.yourAnswer')}
                onKeyDown={(e) =>
                  e.key === 'Enter' && answer.trim() && evaluateAnswer(answer)
                }
              />
            )}
          </>
        )}

        {task.taskType === 'sentence' && (
          <>
            <div className="text-2xl font-bold text-brand-900">{task.english}</div>
            <div className="text-slate-600">{task.russian}</div>
            {!revealed && (
              <Textarea
                rows={2}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('lesson.personalPlaceholder')}
              />
            )}
          </>
        )}

        {task.taskType === 'voice' && !revealed && (
          <>
            <div className="text-2xl font-bold">{task.russian}</div>
            <VoiceRecorder
              submitting={evaluating}
              submitLabel={t('review.check')}
              onSubmit={(transcript, seconds) =>
                evaluateAnswer(transcript, seconds)
              }
            />
          </>
        )}

        {/* Кнопка проверки для текстовых продуктивных заданий */}
        {!revealed && task.taskType !== 'recognition' && task.taskType !== 'voice' && (
          <Button
            onClick={() => answer.trim() && evaluateAnswer(answer)}
            disabled={!answer.trim() || evaluating}
            className="w-full"
          >
            {evaluating ? t('app.loading') : t('review.check')}
          </Button>
        )}
        {!revealed && task.taskType === 'recognition' && (
          <Button
            onClick={() => answer && evaluateAnswer(answer)}
            disabled={!answer}
            className="w-full"
          >
            {t('review.check')}
          </Button>
        )}

        {/* Разбор ответа */}
        {revealed && (
          <div className="space-y-3">
            {evaluation && isProduction ? (
              <ReviewFeedback
                evaluation={evaluation}
                userAnswer={submittedAnswer}
                onRetry={() => {
                  resetItemState();
                }}
              />
            ) : (
              <div
                className={cx(
                  'rounded-xl p-3',
                  wasCorrect ? 'bg-emerald-50' : 'bg-slate-50',
                )}
              >
                <button
                  className="font-semibold text-brand-900 cursor-pointer"
                  onClick={() => speak(task.english)}
                >
                  🔊 {task.english}
                </button>
                <div className="text-slate-600">{task.russian}</div>
                {task.example && (
                  <div className="mt-1 text-sm italic text-slate-500">
                    “{task.example}”
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-slate-500">{t('review.listenAndRate')}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button variant="danger" onClick={() => submit(0)}>
                {t('review.rating0')}
              </Button>
              <Button variant="secondary" onClick={() => submit(1)}>
                {t('review.rating1')}
              </Button>
              <Button variant="secondary" onClick={() => submit(2)}>
                {t('review.rating2')}
              </Button>
              <Button variant="success" onClick={() => submit(3)}>
                {t('review.rating3')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
