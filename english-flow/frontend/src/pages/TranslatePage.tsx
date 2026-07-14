import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { TrainerTask, TranslationEvaluation } from '../api/types';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageTitle,
  ProgressBar,
  Spinner,
  cx,
} from '../components/ui';
import { speak, useSpeechRecognition } from '../lib/voice';

const MODES = ['words', 'phrases', 'sentences', 'professional', 'voice', 'errors'] as const;
type Mode = (typeof MODES)[number];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'’«»()—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function TranslatePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode');
  const [mode, setMode] = useState<Mode>(
    MODES.includes(initialMode as Mode) ? (initialMode as Mode) : 'phrases',
  );
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [pickedIdx, setPickedIdx] = useState<number[]>([]);
  const [result, setResult] = useState<TranslationEvaluation | null>(null);
  const [checking, setChecking] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const stt = useSpeechRecognition();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['trainer-tasks', mode],
    queryFn: () => api.get<TrainerTask[]>(`/trainer/tasks?mode=${mode}&limit=8`),
  });

  const task = tasks?.[index];

  const switchMode = (m: Mode) => {
    setMode(m);
    setIndex(0);
    setAnswer('');
    setPickedIdx([]);
    setResult(null);
    setCorrectCount(0);
    stt.reset();
  };

  const check = async () => {
    if (!task) return;
    const userAnswer =
      task.type === 'order'
        ? pickedIdx.map((i) => task.words?.[i] ?? '').join(' ')
        : task.type === 'voice_ru_en'
          ? stt.transcript || answer
          : answer;
    if (!userAnswer.trim()) return;
    setChecking(true);
    try {
      if (task.type === 'missing' || task.type === 'order' || task.type === 'fix_error') {
        if (task.type === 'fix_error') {
          const response = await api.post<{
            correct: boolean;
            correctedText: string;
            explanation: string;
          }>(`/errors/practice/${task.id}`, { answer: userAnswer });
          setResult({
            aiMode: 'llm',
            verdict: response.correct ? 'correct' : 'incorrect',
            correctAnswer: response.correctedText,
            explanation: response.explanation,
            errors: [],
          });
          if (response.correct) setCorrectCount((n) => n + 1);
        } else {
          const correct = normalize(userAnswer) === normalize(task.answer);
          setResult({
            aiMode: 'llm',
            verdict: correct ? 'correct' : 'incorrect',
            correctAnswer: task.answer,
            explanation: task.hint ? `${task.hint}` : '',
            errors: [],
          });
          if (correct) setCorrectCount((n) => n + 1);
        }
      } else {
        const direction = task.type === 'en_ru' ? 'en_ru' : 'ru_en';
        const evaluation = await api.post<TranslationEvaluation>('/trainer/evaluate', {
          direction,
          prompt: task.prompt,
          expected: task.answer,
          acceptable: task.acceptable,
          userAnswer,
          source: mode === 'voice' ? 'voice_translation' : 'translation_trainer',
        });
        setResult(evaluation);
        if (evaluation.verdict === 'correct' || evaluation.verdict === 'mostly_correct') {
          setCorrectCount((n) => n + 1);
        }
      }
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    setIndex(index + 1);
    setAnswer('');
    setPickedIdx([]);
    setResult(null);
    stt.reset();
  };

  const promptLabel = task
    ? task.type === 'en_ru'
      ? t('translate.prompt_en_ru')
      : task.type === 'missing'
        ? t('translate.prompt_missing')
        : task.type === 'order'
          ? t('translate.prompt_order')
          : task.type === 'voice_ru_en'
            ? t('translate.prompt_voice')
            : task.type === 'fix_error'
              ? t('translate.prompt_fix')
              : t('translate.prompt_ru_en')
    : '';

  return (
    <div className="space-y-4">
      <PageTitle>{t('translate.title')}</PageTitle>
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={cx(
              'rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors',
              mode === m
                ? 'border-brand-700 bg-brand-800 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400',
            )}
          >
            {t(`translate.modes.${m}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState>
          {mode === 'errors' ? t('translate.emptyErrors') : t('translate.empty')}
        </EmptyState>
      ) : !task ? (
        <Card className="space-y-3 text-center">
          <div className="text-3xl">✅</div>
          <h2 className="text-lg font-semibold">{t('translate.sessionDone')}</h2>
          <p className="text-slate-600">
            {t('translate.correctCount', { correct: correctCount, total: tasks.length })}
          </p>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['trainer-tasks', mode] });
              setIndex(0);
              setCorrectCount(0);
              setResult(null);
            }}
          >
            {t('translate.again')}
          </Button>
        </Card>
      ) : (
        <>
          <ProgressBar value={(index / tasks.length) * 100} />
          <Card className="space-y-3">
            <div className="text-sm text-slate-500">{promptLabel}</div>
            <div className="text-xl font-semibold">
              {task.type === 'en_ru' ? (
                <button className="cursor-pointer text-left" onClick={() => speak(task.prompt)}>
                  🔊 {task.prompt}
                </button>
              ) : (
                task.prompt
              )}
            </div>
            {task.type === 'fix_error' && task.explanation && !result && (
              <p className="text-sm text-slate-500">{task.explanation}</p>
            )}

            {!result && task.type === 'order' && (
              <div className="space-y-2">
                <div className="flex min-h-11 flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {pickedIdx.map((wordIndex, i) => (
                    <button
                      key={`${wordIndex}-${i}`}
                      className="rounded-lg bg-brand-800 px-2.5 py-1 text-white cursor-pointer"
                      onClick={() => setPickedIdx(pickedIdx.filter((_, j) => j !== i))}
                    >
                      {task.words?.[wordIndex]}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(task.words ?? []).map((word, i) => (
                    <button
                      key={i}
                      disabled={pickedIdx.includes(i)}
                      className={cx(
                        'rounded-lg border border-slate-300 bg-white px-2.5 py-1 cursor-pointer hover:border-brand-400',
                        pickedIdx.includes(i) && 'opacity-30 cursor-default',
                      )}
                      onClick={() => setPickedIdx([...pickedIdx, i])}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!result && task.type === 'voice_ru_en' && (
              <div className="space-y-2">
                {stt.supported ? (
                  <Button
                    variant={stt.listening ? 'danger' : 'secondary'}
                    className="w-full"
                    onClick={() => (stt.listening ? stt.stop() : stt.start())}
                  >
                    {stt.listening
                      ? `⏹ ${t('speaking.micOn')}`
                      : `🎙️ ${t('speaking.micStart')}`}
                  </Button>
                ) : (
                  <p className="text-sm text-amber-700">{t('speaking.micUnsupported')}</p>
                )}
                {(stt.transcript || stt.interim) && (
                  <div className="rounded-xl bg-slate-50 p-3">{stt.transcript || stt.interim}</div>
                )}
                {!stt.supported && (
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t('translate.yourAnswer')}
                  />
                )}
              </div>
            )}

            {!result &&
              task.type !== 'order' &&
              task.type !== 'voice_ru_en' && (
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t('translate.yourAnswer')}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                />
              )}

            {!result ? (
              <Button onClick={check} disabled={checking} className="w-full">
                {t('app.check')}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      result.verdict === 'correct' || result.verdict === 'mostly_correct'
                        ? 'green'
                        : result.verdict === 'incorrect'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {t(`translate.verdicts.${result.verdict}`)}
                  </Badge>
                  <AiModeBadge mode={result.aiMode} />
                </div>
                <div className="text-sm">
                  <span className="text-slate-500">{t('translate.correctAnswer')}: </span>
                  <button
                    className="font-medium cursor-pointer"
                    onClick={() => speak(result.correctAnswer)}
                  >
                    🔊 {result.correctAnswer}
                  </button>
                </div>
                {result.naturalAlternative && (
                  <div className="text-sm">
                    <span className="text-slate-500">
                      {t('translate.naturalAlternative')}:{' '}
                    </span>
                    {result.naturalAlternative}
                  </div>
                )}
                {result.explanation && (
                  <p className="text-sm text-slate-600">{result.explanation}</p>
                )}
                <Button onClick={next} className="w-full">
                  {t('app.next')}
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
