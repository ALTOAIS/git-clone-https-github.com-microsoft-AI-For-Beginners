import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ReviewQueue, ReviewTask } from '../api/types';
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
import { postWithOfflineFallback, useOnline } from '../lib/offline';
import { speak, useSpeechRecognition } from '../lib/voice';

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
  const { data, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.get<ReviewQueue>('/reviews/queue?limit=10'),
    staleTime: 0,
  });

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const startedAtRef = useRef(Date.now());
  const stt = useSpeechRecognition();

  const tasks = data?.tasks ?? [];
  const task: ReviewTask | undefined = tasks[index];

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [index]);

  if (isLoading) return <Spinner />;

  if (!task) {
    return (
      <div className="space-y-4">
        <PageTitle>{t('review.title')}</PageTitle>
        {reviewedCount > 0 ? (
          <Card className="space-y-3 text-center">
            <div className="text-3xl">🎉</div>
            <h2 className="text-lg font-semibold">{t('review.sessionDone')}</h2>
            <p className="text-slate-600">
              {t('review.reviewed', { count: reviewedCount })}
            </p>
            {queuedOffline && (
              <p className="text-sm text-amber-700">{t('review.offlineSaved')}</p>
            )}
            <Button
              onClick={() => {
                setIndex(0);
                setReviewedCount(0);
                queryClient.invalidateQueries({ queryKey: ['review-queue'] });
                queryClient.invalidateQueries({ queryKey: ['plan-today'] });
              }}
            >
              {t('app.continue')}
            </Button>
          </Card>
        ) : (
          <EmptyState>{t('review.nothingDue')}</EmptyState>
        )}
      </div>
    );
  }

  const checkAnswer = (): boolean => {
    if (task.taskType === 'recognition') {
      return answer === task.russian;
    }
    if (task.taskType === 'translation' || task.taskType === 'voice') {
      const value = task.taskType === 'voice' ? stt.transcript || answer : answer;
      return normalize(value) === normalize(task.english);
    }
    // sentence: принимаем, если содержит ключевые слова фразы
    const keyWords = normalize(task.english)
      .split(' ')
      .filter((w) => w.length > 3);
    const normAnswer = normalize(answer);
    return keyWords.length === 0
      ? normAnswer.length > 0
      : keyWords.filter((w) => normAnswer.includes(w)).length >=
          Math.ceil(keyWords.length * 0.6);
  };

  const reveal = () => {
    setWasCorrect(checkAnswer());
    setRevealed(true);
  };

  const submit = async (confidence: number) => {
    const correct = (wasCorrect ?? false) && confidence > 0;
    const { queued } = await postWithOfflineFallback('/reviews/attempt', {
      phraseId: task.phraseId,
      taskType: task.taskType,
      answer:
        task.taskType === 'voice' ? stt.transcript || answer : answer || undefined,
      correct,
      confidence,
      responseTimeMs: Date.now() - startedAtRef.current,
    });
    if (queued) setQueuedOffline(true);
    setReviewedCount((n) => n + 1);
    setIndex(index + 1);
    setAnswer('');
    setRevealed(false);
    setWasCorrect(null);
    stt.reset();
    // Отметить задачу плана после завершения серии
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
      <PageTitle actions={<Badge tone="blue">{t('review.due', { count: data?.dueTotal ?? 0 })}</Badge>}>
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
                    revealed && option === task.russian && 'border-emerald-500 bg-emerald-50',
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
                onKeyDown={(e) => e.key === 'Enter' && reveal()}
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

        {task.taskType === 'voice' && (
          <>
            <div className="text-2xl font-bold">{task.russian}</div>
            {stt.supported ? (
              <Button
                variant={stt.listening ? 'danger' : 'secondary'}
                onClick={() => (stt.listening ? stt.stop() : stt.start())}
              >
                {stt.listening
                  ? `⏹ ${t('speaking.micOn')}`
                  : `🎙️ ${t('speaking.micStart')}`}
              </Button>
            ) : (
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('translate.yourAnswer')}
              />
            )}
            {(stt.transcript || stt.interim) && (
              <div className="rounded-xl bg-slate-50 p-3 text-slate-700">
                {stt.transcript || stt.interim}
              </div>
            )}
          </>
        )}

        {!revealed ? (
          <Button onClick={reveal} className="w-full">
            {task.taskType === 'recognition' ? t('app.check') : t('review.showAnswer')}
          </Button>
        ) : (
          <div className="space-y-3">
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
            <div className="text-sm text-slate-500">{t('review.rate')}</div>
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
