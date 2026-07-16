import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  ErrorDailySession,
  ErrorPracticeSubmitResult,
  ErrorRecord,
  ErrorSessionTask,
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
} from '../components/ui';
import MicroLessonBanner from '../components/MicroLessonBanner';
import { ruPlural } from '../lib/plural';

const STATUS_TONES: Record<string, 'slate' | 'blue' | 'green' | 'amber' | 'red'> = {
  NEW: 'red',
  PRACTICING: 'amber',
  IMPROVING: 'blue',
  RESOLVED: 'green',
  REPEATED: 'red',
};

const PRACTICE_STATUS_TONES: Record<string, 'slate' | 'blue' | 'green' | 'amber' | 'red'> = {
  NEW: 'red',
  PRACTICING: 'amber',
  COMPLETED_TODAY: 'green',
  SCHEDULED_REVIEW: 'blue',
  RECURRING: 'red',
  MASTERED: 'green',
  ARCHIVED: 'slate',
};

/**
 * Карточка контекста ошибки (раздел 2 ТЗ): откуда ошибка, что было задание,
 * что ответил пользователь, в чём ошибка, как исправить, объяснение,
 * дополнительный пример, источник. Для старых записей без контекста —
 * честное сообщение вместо выдумывания.
 */
function ErrorContextCard({ task }: { task: ErrorSessionTask }) {
  const { t } = useTranslation();
  const moduleLabel = task.sourceModule
    ? t(`errors.context.sourceModule.${task.sourceModule}` as any, task.sourceModule)
    : null;

  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
      {task.hasContext ? (
        <>
          {(task.sourcePrompt || task.sourceContext) && (
            <div>
              <div className="text-slate-500">{t('errors.context.task')}:</div>
              <div className="font-medium text-slate-800">
                {task.sourcePrompt || task.sourceContext}
              </div>
            </div>
          )}
          {task.originalUserAnswer && (
            <div>
              <div className="text-slate-500">{t('errors.context.yourAnswer')}:</div>
              <div>{task.originalUserAnswer}</div>
            </div>
          )}
        </>
      ) : (
        <p className="italic text-slate-500">{t('errors.context.noContext')}</p>
      )}
      <div>
        <div className="text-slate-500">{t('errors.context.mistake')}:</div>
        <div className="text-red-600 line-through">{task.originalText}</div>
      </div>
      <div>
        <div className="text-slate-500">{t('errors.context.correction')}:</div>
        <div className="font-medium text-emerald-700">{task.correctedText}</div>
      </div>
      {task.explanation && (
        <div>
          <div className="text-slate-500">{t('errors.explanation')}:</div>
          <p className="text-slate-700">{task.explanation}</p>
        </div>
      )}
      {task.additionalExample && (
        <div>
          <div className="text-slate-500">{t('errors.context.additionalExample')}:</div>
          <p className="italic text-slate-600">{task.additionalExample}</p>
        </div>
      )}
      {moduleLabel && (
        <div className="text-xs text-slate-400">
          {t('errors.context.source')}: {moduleLabel}
        </div>
      )}
    </div>
  );
}

/**
 * Одно задание ежедневной практики: контекст + упражнение + разбор ответа.
 * Кнопка «Отработано» одновременно — проверка ответа (раздел 7 ТЗ: явного
 * отдельного «Проверить» в списке кнопок нет). Она НЕ присваивает MASTERED
 * сразу — это делает бэкенд только после нескольких успехов в разных
 * контекстах (раздел 5 ТЗ).
 */
function DailyTaskCard({
  task,
  index,
  total,
  onSkip,
  onContinue,
}: {
  task: ErrorSessionTask;
  index: number;
  total: number;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [answer, setAnswer] = useState('');
  const [showCorrect, setShowCorrect] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [submitResult, setSubmitResult] = useState<ErrorPracticeSubmitResult | null>(null);

  const submitMutation = useMutation({
    mutationFn: (value: string) =>
      api.post<ErrorPracticeSubmitResult>(`/errors/daily-session/${task.id}/submit`, {
        answer: value,
      }),
    onSuccess: (result) => setSubmitResult(result),
  });

  const instructionKey =
    task.exercise.type === 'blank' ? 'errors.daily.blankInstruction' : 'errors.daily.correctInstruction';

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="blue">{t('errors.daily.progress', { current: index + 1, total })}</Badge>
        <Badge tone={PRACTICE_STATUS_TONES[task.practiceStatus] ?? 'slate'}>
          {t(`errors.practiceStatus.${task.practiceStatus}`)}
        </Badge>
      </div>

      <ErrorContextCard task={task} />

      {!submitResult ? (
        <div className="space-y-3">
          <div>
            <div className="text-sm text-slate-500">{t(instructionKey)}</div>
            <div className="text-lg font-semibold">{task.exercise.prompt}</div>
          </div>
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t('errors.daily.answerPlaceholder') as string}
            onKeyDown={(e) => e.key === 'Enter' && answer.trim() && submitMutation.mutate(answer)}
          />
          {showCorrect && (
            <p className="text-sm">
              <span className="text-slate-500">{t('errors.daily.correctAnswerLabel')}: </span>
              <span className="font-medium text-emerald-700">{task.exercise.answer}</span>
            </p>
          )}
          {showHelp && <p className="text-sm text-slate-600">{t('errors.daily.explanationDetails')}</p>}
          {showRule && task.ruleDetails && (
            <p className="text-sm text-slate-600">{task.ruleDetails}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => answer.trim() && submitMutation.mutate(answer)}
              disabled={!answer.trim() || submitMutation.isPending}
            >
              {t('errors.daily.practiced')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCorrect(true);
                setAnswer(task.exercise.answer);
              }}
            >
              🔁 {t('errors.daily.repeatCorrect')}
            </Button>
            <Button variant="ghost" onClick={() => setShowHelp((v) => !v)}>
              {t('errors.daily.dontUnderstand')}
            </Button>
            {task.ruleDetails && (
              <Button variant="ghost" onClick={() => setShowRule((v) => !v)}>
                {t('errors.daily.moreAboutRule')}
              </Button>
            )}
            <Button variant="ghost" onClick={onSkip}>
              {t('errors.daily.skip')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('errors.daily.finishForToday')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Badge tone={submitResult.correct ? 'green' : 'red'}>
            {submitResult.correct ? t('errors.daily.correctFeedback') : t('errors.daily.incorrectFeedback')}
          </Badge>
          {!submitResult.correct && (
            <p className="text-sm">
              <span className="text-slate-500">{t('errors.daily.correctAnswerLabel')}: </span>
              <span className="font-medium text-emerald-700">{submitResult.correctedText}</span>
            </p>
          )}
          {submitResult.explanation && (
            <p className="text-sm text-slate-600">{submitResult.explanation}</p>
          )}
          {submitResult.correct && (
            <p className="text-sm text-slate-600">
              {submitResult.mastered
                ? t('errors.daily.masteredNote')
                : t('errors.daily.nextReview', {
                    days: submitResult.nextReviewInDays,
                    dayWord: ruPlural(submitResult.nextReviewInDays ?? 0, 'день', 'дня', 'дней'),
                  })}
            </p>
          )}
          <Button className="w-full" onClick={onContinue}>
            {t('errors.daily.continueNext')}
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Ежедневная практика ошибок (разделы 4–5 ТЗ): фиксированный блок из
 * DAILY_TARGET заданий (честно уменьшается, если активных ошибок меньше),
 * экран начала → практика → экран завершения. Повторное открытие раздела
 * не заставляет проходить уже отработанные сегодня задания заново.
 */
function DailyPracticeBlock() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState(false);
  const [beganToday, setBeganToday] = useState(false);
  const [skipIndex, setSkipIndex] = useState(0);
  const planCompletedRef = useRef(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['errors-daily-session', extra],
    queryFn: () => api.get<ErrorDailySession>(`/errors/daily-session${extra ? '?extra=true' : ''}`),
  });

  const completePlanMutation = useMutation({
    mutationFn: () => api.post('/plans/today/tasks/errors/complete'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plan-today'] }),
  });

  useEffect(() => {
    if (session?.sessionComplete && !planCompletedRef.current) {
      planCompletedRef.current = true;
      completePlanMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.sessionComplete]);

  const afterSubmit = () => {
    setSkipIndex(0);
    queryClient.invalidateQueries({ queryKey: ['errors-daily-session'] });
    queryClient.invalidateQueries({ queryKey: ['errors'] });
    queryClient.invalidateQueries({ queryKey: ['errors-top'] });
    queryClient.invalidateQueries({ queryKey: ['daily-summary'] });
  };

  if (isLoading || !session) return <Spinner />;

  const noErrorsAtAll =
    session.targetCount === 0 && session.tasks.length === 0 && session.completedTasks.length === 0;

  if (noErrorsAtAll) {
    return (
      <Card className="space-y-1 text-center">
        <div className="text-3xl">✨</div>
        <p className="text-slate-600">{t('errors.daily.noErrorsToday')}</p>
      </Card>
    );
  }

  if (!extra && !beganToday && session.completedCount === 0 && session.tasks.length > 0) {
    const minutes = Math.max(1, Math.round(session.targetCount * 1.3));
    return (
      <Card className="space-y-3 text-center">
        <h2 className="text-lg font-semibold">
          {t('errors.daily.intro', {
            count: session.targetCount,
            minutes,
            taskWord: ruPlural(session.targetCount, 'задание', 'задания', 'заданий'),
          })}
        </h2>
        <Button onClick={() => setBeganToday(true)}>{t('errors.daily.start')}</Button>
      </Card>
    );
  }

  const tasks = session.tasks;
  const currentTask = tasks[Math.min(skipIndex, tasks.length - 1)];

  if (!currentTask) {
    if (session.sessionComplete || (extra && session.completedCount > 0)) {
      return (
        <Card className="space-y-3 text-center">
          <div className="text-3xl">✅</div>
          <h2 className="text-lg font-semibold text-emerald-700">
            {t('errors.daily.completeTitle')}
          </h2>
          <p className="text-slate-600">
            {t('errors.daily.completedStat', {
              count: session.completedCount,
              errorWord: ruPlural(session.completedCount, 'ошибка', 'ошибки', 'ошибок'),
            })}
          </p>
          <p className="text-slate-600">
            {t('errors.daily.resolvedStat', { count: session.resolvedToday })}
          </p>
          <p className="text-slate-600">
            {t('errors.daily.scheduledStat', { count: session.scheduledToday })}
          </p>
          {session.scheduledToday > 0 && (
            <p className="text-slate-600">
              {t('errors.daily.nextCheckStat', { days: 3, dayWord: ruPlural(3, 'день', 'дня', 'дней') })}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/" className="flex-1">
              <Button variant="secondary" className="w-full">
                {t('errors.daily.backToToday')}
              </Button>
            </Link>
            {!extra && (
              <Button
                className="flex-1"
                onClick={() => {
                  setExtra(true);
                  setBeganToday(true);
                  setSkipIndex(0);
                }}
              >
                {t('errors.daily.continueExtra')}
              </Button>
            )}
          </div>
        </Card>
      );
    }
    return (
      <Card className="space-y-3 text-center">
        <p className="text-slate-600">{t('errors.daily.noErrorsToday')}</p>
        <Button
          variant="secondary"
          onClick={() => {
            setSkipIndex(0);
            queryClient.invalidateQueries({ queryKey: ['errors-daily-session'] });
          }}
        >
          {t('app.continue')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ProgressBar
        value={(session.completedCount / Math.max(session.targetCount, 1)) * 100}
      />
      <DailyTaskCard
        key={currentTask.id}
        task={currentTask}
        index={session.completedCount}
        total={session.targetCount}
        onSkip={() => setSkipIndex((i) => i + 1)}
        onContinue={afterSubmit}
      />
    </div>
  );
}

export default function ErrorsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: errors, isLoading } = useQuery({
    queryKey: ['errors', statusFilter],
    queryFn: () =>
      api.get<ErrorRecord[]>(`/errors${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/errors/${id}`, { status: 'RESOLVED' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['errors'] }),
  });

  return (
    <div className="space-y-4">
      <PageTitle>{t('errors.title')}</PageTitle>

      <MicroLessonBanner />

      <DailyPracticeBlock />

      <div className="flex flex-wrap gap-2 pt-2">
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">{t('phrases.filters.all')}</option>
          {(['NEW', 'PRACTICING', 'IMPROVING', 'RESOLVED', 'REPEATED'] as const).map(
            (status) => (
              <option key={status} value={status}>
                {t(`errors.status.${status}`)}
              </option>
            ),
          )}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !errors || errors.length === 0 ? (
        <EmptyState>{t('errors.empty')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {errors.map((error) => (
            <Card key={error.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONES[error.status]}>
                  {t(`errors.status.${error.status}`)}
                </Badge>
                <Badge tone="slate">
                  {t(`errors.types.${error.errorType}` as any, error.errorType)}
                </Badge>
                <span className="text-xs text-slate-400">
                  {t('errors.occurrences', { count: error.occurrenceCount })}
                </span>
              </div>
              <div>
                <div className="text-sm text-slate-500">{t('errors.yourVersion')}:</div>
                <div className="text-red-600 line-through">{error.originalText}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{t('errors.correctVersion')}:</div>
                <div className="font-medium text-emerald-700">{error.correctedText}</div>
              </div>
              {error.explanation && (
                <p className="text-sm text-slate-600">{error.explanation}</p>
              )}
              {error.personalExample && (
                <p className="text-sm italic text-slate-500">
                  {t('errors.personalExample')}: “{error.personalExample}”
                </p>
              )}
              {error.originalUserAnswer && (
                <p className="text-xs text-slate-400">
                  {t('errors.context.yourAnswer')}: {error.originalUserAnswer}
                </p>
              )}
              {error.status !== 'RESOLVED' && (
                <Button
                  variant="ghost"
                  onClick={() => resolveMutation.mutate(error.id)}
                >
                  ✓ {t('errors.markResolved')}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
