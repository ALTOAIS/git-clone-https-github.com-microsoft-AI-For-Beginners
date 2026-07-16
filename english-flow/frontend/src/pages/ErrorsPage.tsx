import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
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
import { normalizeEn } from '../lib/normalizeEn';

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
 * Грубая клиентская эвристика "похоже на повреждённую запись" — только для
 * UI-подсказки (значок + кнопка удаления). Реальное исключение таких
 * записей из ежедневной практики уже применяется на бэкенде
 * (getDailySession), это не источник истины.
 */
function looksNonEnglish(text: string): boolean {
  const cyrillic = (text.match(/[а-яёА-ЯЁ]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  const total = cyrillic + latin;
  return total > 0 && cyrillic / total >= 0.5;
}

/**
 * Минимальный набор полей, которого достаточно для карточки контекста —
 * им удовлетворяют и ErrorSessionTask (ежедневная практика), и обычный
 * ErrorRecord (общий список /errors), поэтому оба места используют один
 * и тот же компонент вместо двух разных вёрсток карточки.
 */
interface ErrorContextCardData {
  hasContext: boolean;
  sourceModule?: string | null;
  sourcePrompt?: string | null;
  sourceContext?: string | null;
  originalUserAnswer?: string | null;
  originalText: string;
  correctedText: string;
  explanation: string;
  additionalExample?: string | null;
}

/**
 * Карточка контекста ошибки (раздел 2 ТЗ): откуда ошибка, что было задание,
 * что ответил пользователь, в чём ошибка, как исправить, объяснение,
 * дополнительный пример, источник. Для старых записей без контекста —
 * честное сообщение вместо выдумывания.
 */
function ErrorContextCard({ task }: { task: ErrorContextCardData }) {
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
 * Кнопка удаления повреждённой legacy-записи (раздел 7 доработок). Своя
 * useMutation на карточку — пока запись A удаляется, кнопка на записи B
 * не блокируется и не показывает чужую ошибку. Удаление необратимо, поэтому
 * требует явного подтверждения; из UI запись исчезает только после
 * успешного ответа backend (invalidateQueries запускает рефетч списка).
 */
function DeleteInvalidRecordButton({ id }: { id: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/errors/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['errors'] }),
  });

  return (
    <div className="space-y-1">
      <Button
        variant="danger"
        disabled={deleteMutation.isPending}
        onClick={() => {
          if (!window.confirm(t('errors.context.deleteConfirm') as string)) return;
          deleteMutation.mutate();
        }}
      >
        {deleteMutation.isPending
          ? t('errors.context.deleting')
          : t('errors.context.deleteInvalid')}
      </Button>
      {deleteMutation.isError && (
        <p className="text-xs text-red-600">
          {deleteMutation.error instanceof ApiError
            ? deleteMutation.error.message
            : t('errors.context.deleteFailed')}
        </p>
      )}
    </div>
  );
}

/**
 * Одно задание ежедневной практики: контекст + упражнение + разбор ответа.
 * «Проверить ответ» и «Завершить упражнение» — раздельные действия: проверка
 * ничего не сохраняет (мгновенное локальное сравнение), а завершение — это
 * единственный сетевой вызов, который меняет статус ошибки. Он НЕ
 * присваивает MASTERED сразу — это делает бэкенд только после нескольких
 * успехов в разных контекстах (раздел 5 ТЗ).
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
  const [checked, setChecked] = useState<{ correct: boolean } | null>(null);
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

  const skipMutation = useMutation({
    mutationFn: () => api.post(`/errors/daily-session/${task.id}/skip`),
    onSuccess: onSkip,
  });

  const instructionKey =
    task.exercise.type === 'blank' ? 'errors.daily.blankInstruction' : 'errors.daily.correctInstruction';

  // «Проверить ответ»: только локальное сравнение, ничего не отправляет и не
  // меняет статус ошибки — это делает исключительно «Завершить упражнение».
  const check = () => {
    if (!answer.trim()) return;
    setChecked({ correct: normalizeEn(answer) === normalizeEn(task.exercise.answer) });
  };

  return (
    <div data-testid="daily-practice-card">
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
            onChange={(e) => {
              setAnswer(e.target.value);
              setChecked(null);
            }}
            placeholder={t('errors.daily.answerPlaceholder') as string}
            onKeyDown={(e) => e.key === 'Enter' && (checked ? submitMutation.mutate(answer) : check())}
          />
          {checked && (
            <Badge tone={checked.correct ? 'green' : 'red'}>
              {checked.correct ? t('errors.daily.checkCorrect') : t('errors.daily.checkIncorrect')}
            </Badge>
          )}
          {showCorrect && (
            <p className="text-sm">
              <span className="text-slate-500">{t('errors.daily.correctAnswerLabel')}: </span>
              <span className="font-medium text-emerald-700">{task.exercise.answer}</span>
            </p>
          )}
          {showHelp && (
            <div className="space-y-1.5 rounded-xl bg-brand-50 p-3 text-sm">
              <div>
                <span className="font-medium text-brand-900">
                  {t('errors.daily.simplifiedLabel')}:{' '}
                </span>
                {task.helpDetails.simplified}
              </div>
              {task.helpDetails.formula && (
                <div>
                  <span className="font-medium text-brand-900">
                    {t('errors.daily.formulaLabel')}:{' '}
                  </span>
                  <span className="font-mono">{task.helpDetails.formula}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-brand-900">
                  {t('errors.daily.contrastLabel')}:{' '}
                </span>
                <span className="text-red-600 line-through">{task.helpDetails.contrast.wrong}</span>
                {' → '}
                <span className="text-emerald-700">{task.helpDetails.contrast.right}</span>
              </div>
            </div>
          )}
          {showRule && task.ruleDetails && (
            <p className="text-sm text-slate-600">{task.ruleDetails}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {!checked ? (
              <Button onClick={check} disabled={!answer.trim()}>
                {t('errors.daily.check')}
              </Button>
            ) : (
              <Button
                onClick={() => submitMutation.mutate(answer)}
                disabled={submitMutation.isPending}
              >
                {t('errors.daily.finish')}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setShowCorrect(true);
                setAnswer(task.exercise.answer);
                setChecked(null);
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
            <Button
              variant="ghost"
              disabled={skipMutation.isPending}
              onClick={() => skipMutation.mutate()}
            >
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
    </div>
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

  // Единая точка обновления после завершения ИЛИ пропуска задания — оба
  // действия сохраняются на бэкенде, поэтому следующее задание сессии
  // берётся из свежего ответа сервера, а не из локального указателя.
  const refreshSession = () => {
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

  if (!extra && !beganToday && session.dispositionedCount === 0 && session.tasks.length > 0) {
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

  const currentTask = session.tasks[0];

  if (!currentTask) {
    if (session.sessionComplete || (extra && session.dispositionedCount > 0)) {
      return (
        <Card className="space-y-3 text-center">
          <div className="text-3xl">✅</div>
          <h2 className="text-lg font-semibold text-emerald-700">
            {t('errors.daily.completeTitle')}
          </h2>
          <p className="text-slate-600">
            {t('errors.daily.completedStat', {
              count: session.dispositionedCount,
              errorWord: ruPlural(session.dispositionedCount, 'ошибка', 'ошибки', 'ошибок'),
            })}
          </p>
          <p className="text-slate-600">
            {t('errors.daily.resolvedStat', { count: session.resolvedToday })}
          </p>
          {session.skippedCount > 0 && (
            <p className="text-slate-600">
              {t('errors.daily.skippedStat', { count: session.skippedCount })}
            </p>
          )}
          <p className="text-slate-600">
            {t('errors.daily.scheduledStat', { count: session.scheduledToday })}
          </p>
          {session.scheduledToday > 0 && (
            <p className="text-slate-600">
              {t('errors.daily.nextCheckStat', { days: 3, dayWord: ruPlural(3, 'день', 'дня', 'дней') })}
            </p>
          )}
          {session.skippedCount > 0 && (
            <p className="text-xs text-slate-400">{t('errors.daily.skippedNote')}</p>
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
        <Button variant="secondary" onClick={refreshSession}>
          {t('app.continue')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ProgressBar
        value={(session.dispositionedCount / Math.max(session.targetCount, 1)) * 100}
      />
      <DailyTaskCard
        key={currentTask.id}
        task={currentTask}
        index={session.dispositionedCount}
        total={session.targetCount}
        onSkip={refreshSession}
        onContinue={refreshSession}
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
          {errors.map((error) => {
            const hasContext = !!(
              error.sourceModule ||
              error.sourcePrompt ||
              error.sourceContext ||
              error.originalUserAnswer
            );
            const scheduledFuture =
              error.practiceStatus === 'SCHEDULED_REVIEW' &&
              !!error.nextPracticeAt &&
              new Date(error.nextPracticeAt).getTime() > Date.now();
            const suspectInvalid = looksNonEnglish(error.correctedText);
            return (
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
                  {scheduledFuture && (
                    <Badge tone="blue">
                      {t('errors.context.scheduledFor', {
                        date: new Date(error.nextPracticeAt!).toLocaleDateString('ru-RU'),
                      })}
                    </Badge>
                  )}
                  {suspectInvalid && (
                    <Badge tone="red">⚠ {t('errors.context.invalidRecord')}</Badge>
                  )}
                </div>
                <ErrorContextCard
                  task={{
                    hasContext,
                    sourceModule: error.sourceModule,
                    sourcePrompt: error.sourcePrompt,
                    sourceContext: error.sourceContext,
                    originalUserAnswer: error.originalUserAnswer,
                    originalText: error.originalText,
                    correctedText: error.correctedText,
                    explanation: error.explanation,
                  }}
                />
                {error.personalExample && (
                  <p className="text-sm italic text-slate-500">
                    {t('errors.personalExample')}: “{error.personalExample}”
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {error.status !== 'RESOLVED' && (
                    <Button
                      variant="ghost"
                      onClick={() => resolveMutation.mutate(error.id)}
                    >
                      ✓ {t('errors.markResolved')}
                    </Button>
                  )}
                  {suspectInvalid && <DeleteInvalidRecordButton id={error.id} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
