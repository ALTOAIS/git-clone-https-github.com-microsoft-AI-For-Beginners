import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  Lesson,
  LessonAttempt,
  SentenceEvaluation,
  TranslationEvaluation,
  TranslationTask,
  UserPhrase,
} from '../api/types';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  Input,
  ProgressBar,
  Spinner,
  Textarea,
  cx,
} from '../components/ui';
import { speak, useSpeechRecognition } from '../lib/voice';
import DailySummaryCard from '../components/DailySummaryCard';
import { LanguageIssueNotice } from '../components/LanguageIssueNotice';

type Stage =
  | 'warmup'
  | 'phrases'
  | 'translate'
  | 'personal'
  | 'speaking'
  | 'dialogue'
  | 'summary';

const STAGES: Stage[] = [
  'warmup',
  'phrases',
  'translate',
  'personal',
  'speaking',
  'dialogue',
  'summary',
];

const STAGE_LABEL_KEY: Record<Stage, string> = {
  warmup: 'lesson.stageWarmup',
  phrases: 'lesson.stageNew',
  translate: 'lesson.stageTranslate',
  personal: 'lesson.stagePersonal',
  speaking: 'lesson.stageSpeaking',
  dialogue: 'lesson.stageDialogue',
  summary: 'lesson.stageSummary',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'’«»()—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------- Перевод: одна задача ---------------- */
function TranslateTask({
  task,
  onDone,
}: {
  task: TranslationTask;
  onDone: (correct: boolean) => void;
}) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState('');
  const [pickedIdx, setPickedIdx] = useState<number[]>([]);
  const picked = pickedIdx.map((i) => task.words?.[i] ?? '');
  const [result, setResult] = useState<TranslationEvaluation | null>(null);
  const [checking, setChecking] = useState(false);

  const promptLabel =
    task.type === 'ru_en'
      ? t('translate.prompt_ru_en')
      : task.type === 'en_ru'
        ? t('translate.prompt_en_ru')
        : task.type === 'missing'
          ? t('translate.prompt_missing')
          : t('translate.prompt_order');

  const check = async () => {
    const userAnswer = task.type === 'order' ? picked.join(' ') : answer;
    if (!userAnswer.trim()) return;
    setChecking(true);
    try {
      if (task.type === 'missing' || task.type === 'order') {
        const correct = normalize(userAnswer) === normalize(task.answer);
        setResult({
          aiMode: 'llm',
          verdict: correct ? 'correct' : 'incorrect',
          correctAnswer: task.answer,
          explanation: '',
          errors: [],
        });
      } else {
        const evaluation = await api.post<TranslationEvaluation>(
          '/trainer/evaluate',
          {
            direction: task.type,
            prompt: task.prompt,
            expected: task.answer,
            acceptable: task.acceptable,
            userAnswer,
            source: 'lesson',
          },
        );
        setResult(evaluation);
      }
    } finally {
      setChecking(false);
    }
  };

  const verdictOk =
    result?.verdict === 'correct' || result?.verdict === 'mostly_correct';

  return (
    <Card className="space-y-3">
      <div className="text-sm text-slate-500">{promptLabel}</div>
      <div className="text-lg font-semibold">{task.prompt}</div>
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
            {(task.words ?? []).map((word, i) => {
              const used = pickedIdx.includes(i);
              return (
                <button
                  key={i}
                  disabled={used}
                  className={cx(
                    'rounded-lg border border-slate-300 bg-white px-2.5 py-1 cursor-pointer hover:border-brand-400',
                    used && 'opacity-30 cursor-default',
                  )}
                  onClick={() => setPickedIdx([...pickedIdx, i])}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!result && task.type !== 'order' && (
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t('translate.yourAnswer')}
          onKeyDown={(e) => e.key === 'Enter' && check()}
        />
      )}
      {!result ? (
        <Button onClick={check} disabled={checking}>
          {t('app.check')}
        </Button>
      ) : result.languageIssue ? (
        <div className="space-y-2">
          <LanguageIssueNotice issue={result.languageIssue} />
          <Button onClick={() => onDone(false)}>{t('app.next')}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={verdictOk ? 'green' : result.verdict === 'incorrect' ? 'red' : 'amber'}>
              {t(`translate.verdicts.${result.verdict}`)}
            </Badge>
            <AiModeBadge mode={result.aiMode} fallbackReason={result.fallbackReason} />
          </div>
          {!verdictOk && (
            <div className="text-sm">
              <span className="text-slate-500">{t('translate.correctAnswer')}: </span>
              <span className="font-medium">{result.correctAnswer}</span>
            </div>
          )}
          {result.naturalAlternative && (
            <div className="text-sm">
              <span className="text-slate-500">{t('translate.naturalAlternative')}: </span>
              {result.naturalAlternative}
            </div>
          )}
          {result.explanation && (
            <p className="text-sm text-slate-600">{result.explanation}</p>
          )}
          <Button onClick={() => onDone(!!verdictOk)}>{t('app.next')}</Button>
        </div>
      )}
    </Card>
  );
}

/* ---------------- Основной плеер ---------------- */
export default function LessonPlayerPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.get<Lesson>(`/lessons/${id}`),
  });
  const { data: warmupPhrases } = useQuery({
    queryKey: ['warmup-phrases'],
    queryFn: () => api.get<UserPhrase[]>('/phrases?filter=learning'),
  });

  const [stageIndex, setStageIndex] = useState(0);
  const [attempt, setAttempt] = useState<LessonAttempt | null>(null);
  const startedRef = useRef(false);

  // Прогресс внутри этапов
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [taskIndex, setTaskIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalChecked, setTotalChecked] = useState(0);
  const [errorsCount, setErrorsCount] = useState(0);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);

  // Этап 4: личное предложение
  const [personalSentence, setPersonalSentence] = useState('');
  const [personalEval, setPersonalEval] = useState<SentenceEvaluation | null>(null);
  const [personalChecking, setPersonalChecking] = useState(false);

  // Этап 5: говорение
  const stt = useSpeechRecognition();
  const [spokenResult, setSpokenResult] = useState('');

  // Этап 6: мини-диалог
  const [dialogueTurns, setDialogueTurns] = useState<
    { role: 'user' | 'assistant'; text: string }[]
  >([]);
  const [dialogueInput, setDialogueInput] = useState('');
  const [dialogueQuestion, setDialogueQuestion] = useState(0);
  const dialogueStt = useSpeechRecognition();

  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!id || startedRef.current || !lesson) return;
    startedRef.current = true;
    api
      .post<LessonAttempt>(`/lessons/${id}/attempts`)
      .then(setAttempt)
      .catch(() => undefined);
  }, [id, lesson]);

  const content = lesson?.contentJson;
  const stage = STAGES[stageIndex];
  const warmup = useMemo(
    () => (warmupPhrases ?? []).slice(0, 3),
    [warmupPhrases],
  );

  useEffect(() => {
    if (stage === 'dialogue' && content && dialogueTurns.length === 0) {
      setDialogueTurns([{ role: 'assistant', text: content.dialogue.aiOpening }]);
      speak(content.dialogue.aiOpening);
    }
  }, [stage, content, dialogueTurns.length]);

  if (isLoading || !lesson || !content) return <Spinner />;

  const goNext = () => setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));

  const finishLesson = async () => {
    if (finished) return;
    setFinished(true);
    const score =
      totalChecked > 0 ? Math.round((correctCount / totalChecked) * 100) : null;
    if (attempt) {
      await api.patch(`/lessons/attempts/${attempt.id}`, {
        score: score ?? undefined,
        speakingSeconds,
        errorsCount,
      });
    }
    // Отмечаем задачу «урок» в дневном плане
    try {
      await api.post('/plans/today/tasks/lesson/complete');
    } catch {
      /* задача может отсутствовать в плане */
    }
    queryClient.invalidateQueries({ queryKey: ['plan-today'] });
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  };

  const dialogueReply = (text: string, seconds: number) => {
    if (!text.trim()) return;
    const turns = [...dialogueTurns, { role: 'user' as const, text }];
    setSpeakingSeconds((s) => s + Math.max(seconds, 3));
    const questions = content.dialogue.questions;
    if (dialogueQuestion < questions.length) {
      const question = questions[dialogueQuestion];
      turns.push({ role: 'assistant', text: question });
      setDialogueQuestion(dialogueQuestion + 1);
      speak(question);
    }
    setDialogueTurns(turns);
    setDialogueInput('');
    dialogueStt.reset();
  };

  const speakingTarget =
    personalEval?.natural || personalEval?.corrected || personalSentence ||
    content.newPhrases[0]?.example || content.newPhrases[0]?.english || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{lesson.title}</h1>
        <Badge tone="blue">{t(STAGE_LABEL_KEY[stage])}</Badge>
      </div>
      <ProgressBar value={((stageIndex + 1) / STAGES.length) * 100} />

      {/* Этап 1. Разминка */}
      {stage === 'warmup' && (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">{t('lesson.warmupTitle')}</h2>
          <p className="text-sm text-slate-500">{t('lesson.warmupHint')}</p>
          {warmup.length === 0 ? (
            <p className="text-slate-500">—</p>
          ) : (
            <div className="space-y-2">
              {warmup.map((up) => (
                <WarmupCard key={up.id} english={up.phrase.englishText} russian={up.phrase.russianTranslation} />
              ))}
            </div>
          )}
          <Button onClick={goNext} className="w-full">
            {t('app.continue')}
          </Button>
        </Card>
      )}

      {/* Этап 2. Новые фразы */}
      {stage === 'phrases' && (
        <Card className="space-y-4">
          <div className="text-sm text-slate-500">
            {phraseIndex + 1} / {content.newPhrases.length}
          </div>
          {(() => {
            const phrase = content.newPhrases[phraseIndex];
            return (
              <div className="space-y-3">
                <button
                  className="text-2xl font-bold text-brand-900 cursor-pointer text-left"
                  onClick={() => speak(phrase.english)}
                >
                  🔊 {phrase.english}
                </button>
                <div className="text-lg text-slate-700">{phrase.russian}</div>
                {phrase.hint && (
                  <div className="text-sm text-slate-400">[{phrase.hint}]</div>
                )}
                {phrase.example && (
                  <button
                    className="block rounded-xl bg-slate-50 p-3 text-left text-slate-600 italic w-full cursor-pointer"
                    onClick={() => speak(phrase.example!)}
                  >
                    “{phrase.example}”
                  </button>
                )}
                {phrase.context && (
                  <div className="text-sm text-slate-500">{phrase.context}</div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      if (phraseIndex + 1 < content.newPhrases.length) {
                        setPhraseIndex(phraseIndex + 1);
                      } else {
                        goNext();
                      }
                    }}
                  >
                    {t('lesson.iKnow')}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (phraseIndex + 1 < content.newPhrases.length) {
                        setPhraseIndex(phraseIndex + 1);
                      } else {
                        goNext();
                      }
                    }}
                  >
                    {t('lesson.needsPractice')}
                  </Button>
                </div>
              </div>
            );
          })()}
          {content.grammarPoint && phraseIndex === content.newPhrases.length - 1 && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
              <div className="font-semibold text-brand-900">
                {t('lesson.grammarTitle')}: {content.grammarPoint.title}
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {content.grammarPoint.explanation}
              </p>
              <ul className="mt-2 space-y-1 text-sm italic text-slate-600">
                {content.grammarPoint.examples.map((example, i) => (
                  <li key={i}>• {example}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Этап 3. Перевод */}
      {stage === 'translate' && (
        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            {Math.min(taskIndex + 1, content.translationTasks.length)} /{' '}
            {content.translationTasks.length}
          </div>
          <TranslateTask
            key={taskIndex}
            task={content.translationTasks[taskIndex]}
            onDone={(correct) => {
              setTotalChecked((n) => n + 1);
              if (correct) setCorrectCount((n) => n + 1);
              else setErrorsCount((n) => n + 1);
              if (taskIndex + 1 < content.translationTasks.length) {
                setTaskIndex(taskIndex + 1);
              } else {
                goNext();
              }
            }}
          />
        </div>
      )}

      {/* Этап 4. Своё предложение */}
      {stage === 'personal' && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{t('lesson.personalInstruction')}</h2>
          <div className="rounded-xl bg-brand-50 p-3 font-medium text-brand-900">
            {content.personalPrompt.phrase}
          </div>
          <p className="text-slate-600">{content.personalPrompt.instruction}</p>
          <Textarea
            rows={3}
            value={personalSentence}
            onChange={(e) => setPersonalSentence(e.target.value)}
            placeholder={t('lesson.personalPlaceholder')}
          />
          {!personalEval ? (
            <Button
              disabled={!personalSentence.trim() || personalChecking}
              onClick={async () => {
                setPersonalChecking(true);
                try {
                  const evaluation = await api.post<SentenceEvaluation>(
                    '/lessons/evaluate-sentence',
                    {
                      sentence: personalSentence,
                      targetPhrase: content.personalPrompt.phrase,
                      context: content.personalPrompt.instruction,
                      lessonId: id,
                    },
                  );
                  setPersonalEval(evaluation);
                  if (!evaluation.languageIssue) {
                    setTotalChecked((n) => n + 1);
                    if (evaluation.errors.length === 0) setCorrectCount((n) => n + 1);
                    else setErrorsCount((n) => n + evaluation.errors.length);
                  }
                } finally {
                  setPersonalChecking(false);
                }
              }}
            >
              {t('app.check')}
            </Button>
          ) : personalEval.languageIssue ? (
            <div className="space-y-2">
              <LanguageIssueNotice issue={personalEval.languageIssue} />
              <Button onClick={goNext}>{t('app.next')}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AiModeBadge mode={personalEval.aiMode} fallbackReason={personalEval.fallbackReason} />
              <div className="text-sm">
                <span className="text-slate-500">{t('lesson.aiSuggestion')}: </span>
                <button
                  className="font-medium text-emerald-700 cursor-pointer"
                  onClick={() => speak(personalEval.natural)}
                >
                  🔊 {personalEval.natural}
                </button>
              </div>
              {personalEval.explanation && (
                <p className="text-sm text-slate-600">{personalEval.explanation}</p>
              )}
              <Button onClick={goNext}>{t('app.next')}</Button>
            </div>
          )}
        </Card>
      )}

      {/* Этап 5. Говорение */}
      {stage === 'speaking' && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{t('lesson.speakingTitle')}</h2>
          <p className="text-slate-600">{t('lesson.speakingInstruction')}</p>
          <div className="rounded-xl bg-brand-50 p-3">
            <div className="text-sm text-slate-500">{t('lesson.intended')}:</div>
            <button
              className="font-medium text-brand-900 cursor-pointer text-left"
              onClick={() => speak(speakingTarget)}
            >
              🔊 {speakingTarget}
            </button>
          </div>
          {stt.supported ? (
            <Button
              variant={stt.listening ? 'danger' : 'primary'}
              className="w-full"
              onClick={() => {
                if (stt.listening) {
                  stt.stop();
                } else {
                  setSpokenResult('');
                  stt.start();
                }
              }}
            >
              {stt.listening ? `⏹ ${t('diagnostic.stopRecording')}` : `🎙️ ${t('speaking.micStart')}`}
            </Button>
          ) : (
            <p className="text-sm text-amber-700">{t('speaking.micUnsupported')}</p>
          )}
          {(stt.transcript || stt.interim) && (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-sm text-slate-500">{t('lesson.recognized')}:</div>
              <div>{stt.transcript || stt.interim}</div>
            </div>
          )}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              const recognized = stt.transcript;
              if (recognized) {
                setSpokenResult(recognized);
                setSpeakingSeconds((s) => s + Math.max(stt.seconds, 3));
                const overlap =
                  normalize(recognized) === normalize(speakingTarget);
                setTotalChecked((n) => n + 1);
                if (overlap) setCorrectCount((n) => n + 1);
              }
              goNext();
            }}
          >
            {spokenResult || stt.transcript ? t('app.next') : t('app.skip')}
          </Button>
        </Card>
      )}

      {/* Этап 6. Мини-диалог */}
      {stage === 'dialogue' && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{content.dialogue.title}</h2>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {dialogueTurns.map((turn, i) => (
              <div
                key={i}
                className={cx(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px]',
                  turn.role === 'assistant'
                    ? 'bg-slate-100 text-slate-800'
                    : 'ml-auto bg-brand-800 text-white',
                )}
              >
                {turn.text}
              </div>
            ))}
          </div>
          {dialogueQuestion <= content.dialogue.questions.length ? (
            <div className="space-y-2">
              {dialogueStt.supported && (
                <Button
                  variant={dialogueStt.listening ? 'danger' : 'secondary'}
                  className="w-full"
                  onClick={() => {
                    if (dialogueStt.listening) {
                      dialogueStt.stop();
                    } else {
                      dialogueStt.start();
                    }
                  }}
                >
                  {dialogueStt.listening
                    ? `⏹ ${t('speaking.micOn')}`
                    : `🎙️ ${t('speaking.micStart')}`}
                </Button>
              )}
              {dialogueStt.transcript && !dialogueStt.listening && (
                <Button
                  className="w-full"
                  onClick={() => dialogueReply(dialogueStt.transcript, dialogueStt.seconds)}
                >
                  {t('lesson.send')}: “{dialogueStt.transcript.slice(0, 40)}…”
                </Button>
              )}
              <div className="flex gap-2">
                <Input
                  value={dialogueInput}
                  onChange={(e) => setDialogueInput(e.target.value)}
                  placeholder={t('lesson.yourMessage')}
                  onKeyDown={(e) => e.key === 'Enter' && dialogueReply(dialogueInput, 5)}
                />
                <Button onClick={() => dialogueReply(dialogueInput, 5)}>
                  {t('lesson.send')}
                </Button>
              </div>
            </div>
          ) : null}
          <Button
            variant={dialogueQuestion > content.dialogue.questions.length ? 'primary' : 'ghost'}
            className="w-full"
            onClick={() => {
              void finishLesson();
              goNext();
            }}
          >
            {t('lesson.finishDialogue')}
          </Button>
        </Card>
      )}

      {/* Этап 7. Итоги */}
      {stage === 'summary' && (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">{t('lesson.stageSummary')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat label={t('lesson.summaryPhrases')} value={content.newPhrases.length} />
            <SummaryStat
              label={t('lesson.summaryCorrect')}
              value={`${correctCount} / ${totalChecked}`}
            />
            <SummaryStat label={t('lesson.summaryErrors')} value={errorsCount} />
            <SummaryStat
              label={t('lesson.summarySpeaking')}
              value={`${speakingSeconds} ${t('lesson.sec')}`}
            />
          </div>
          <p className="text-sm text-emerald-700">
            ✓ {t('lesson.summaryAddedToReview')}
          </p>
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <span className="font-medium text-slate-800">
              {t('lesson.summaryRecommendation')}:{' '}
            </span>
            {t('lesson.recommendationText')}
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              await finishLesson();
              navigate('/');
            }}
          >
            {t('lesson.finish')}
          </Button>
        </Card>
      )}

      {stage === 'summary' && <DailySummaryCard />}
    </div>
  );
}

function WarmupCard({ english, russian }: { english: string; russian: string }) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
      <button
        className="text-left font-medium text-brand-900 cursor-pointer"
        onClick={() => speak(english)}
      >
        🔊 {english}
      </button>
      {flipped ? (
        <span className="text-slate-600">{russian}</span>
      ) : (
        <button
          className="text-sm text-brand-700 hover:underline cursor-pointer shrink-0"
          onClick={() => setFlipped(true)}
        >
          {t('lesson.showTranslation')}
        </button>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}
