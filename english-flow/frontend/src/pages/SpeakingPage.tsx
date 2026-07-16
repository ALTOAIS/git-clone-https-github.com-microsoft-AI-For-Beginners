import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  Conversation,
  ConversationTurn,
  ScenariosResponse,
  SpeakingFeedback,
  SpeakingStats,
  SpeakingTurnResult,
} from '../api/types';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  Input,
  PageTitle,
  Spinner,
  cx,
  levelLabel,
} from '../components/ui';
import { speak, useSpeechRecognition } from '../lib/voice';
import DailySummaryCard from '../components/DailySummaryCard';
import MicroLessonBanner from '../components/MicroLessonBanner';

export default function SpeakingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: scenariosData, isLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.get<ScenariosResponse>('/conversations/scenarios'),
  });

  const [modeFilter, setModeFilter] = useState<string>('all');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [hint, setHint] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [aiMode, setAiMode] = useState<'llm' | 'fallback' | undefined>();
  const [feedback, setFeedback] = useState<
    (SpeakingFeedback & { stats?: SpeakingStats }) | null
  >(null);
  const [savedPhrases, setSavedPhrases] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);
  const secondsRef = useRef(0);
  const stt = useSpeechRecognition();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoStartRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const startConversation = async (scenarioId: string) => {
    const created = await api.post<Conversation>('/conversations', { scenarioId });
    setConversation(created);
    setTurns(created.transcriptJson);
    setFeedback(null);
    setAiMode(created.aiMode);
    setSavedPhrases([]);
    secondsRef.current = 0;
    speak(created.transcriptJson[0]?.text ?? '');
  };

  // Автостарт сценария из query (?scenario=daily-question)
  useEffect(() => {
    const scenarioId = searchParams.get('scenario');
    if (scenarioId && scenariosData && !autoStartRef.current) {
      autoStartRef.current = true;
      void startConversation(scenarioId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenariosData, searchParams]);

  const sendMessage = async (text: string, speakingSeconds: number) => {
    if (!conversation || !text.trim() || sending) return;
    setSending(true);
    setInput('');
    stt.reset();
    setTurns((prev) => [...prev, { role: 'user', text }]);
    secondsRef.current += Math.max(speakingSeconds, 3);
    try {
      const result = await api.post<SpeakingTurnResult>(
        `/conversations/${conversation.id}/turns`,
        { text, speakingSeconds: Math.max(speakingSeconds, 3) },
      );
      setTurns((prev) => [...prev, { role: 'assistant', text: result.reply }]);
      setHint(result.hintRu ?? '');
      setAiMode(result.aiMode);
      if (!paused) speak(result.reply);
    } finally {
      setSending(false);
    }
  };

  const finish = async () => {
    if (!conversation || finishing) return;
    setFinishing(true);
    try {
      const result = await api.post<{
        feedback: SpeakingFeedback;
        stats: SpeakingStats;
      }>(`/conversations/${conversation.id}/finish`);
      setFeedback({ ...result.feedback, stats: result.stats });
      try {
        await api.post('/plans/today/tasks/speaking/complete');
        await api.post('/plans/today/tasks/voice/complete');
      } catch {
        /* задач может не быть в плане */
      }
      queryClient.invalidateQueries({ queryKey: ['plan-today'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['errors-top'] });
    } finally {
      setFinishing(false);
    }
  };

  if (isLoading || !scenariosData) return <Spinner />;

  /* ------- Итоги разговора ------- */
  if (feedback && conversation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <PageTitle>{t('speaking.feedbackTitle')}</PageTitle>
          <AiModeBadge mode={feedback.aiMode} />
        </div>
        <Card className="space-y-2">
          <h2 className="font-semibold text-emerald-700">{t('speaking.wentWell')}</h2>
          <ul className="list-disc pl-5 text-slate-700">
            {feedback.wentWell.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>
        {feedback.mistakes.length > 0 && (
          <Card className="space-y-3">
            <h2 className="font-semibold">{t('speaking.mistakes')}</h2>
            {feedback.mistakes.map((mistake, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="text-red-600 line-through">{mistake.original}</div>
                <div className="font-medium text-emerald-700">{mistake.corrected}</div>
                <div className="text-slate-500">{mistake.explanation}</div>
              </div>
            ))}
          </Card>
        )}
        {feedback.betterPhrases.length > 0 && (
          <Card className="space-y-3">
            <h2 className="font-semibold">{t('speaking.betterPhrases')}</h2>
            {feedback.betterPhrases.map((phrase, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="text-slate-500">{phrase.original}</div>
                <div className="font-medium text-brand-800">→ {phrase.better}</div>
              </div>
            ))}
          </Card>
        )}
        {feedback.vocabulary.length > 0 && (
          <Card className="space-y-3">
            <h2 className="font-semibold">{t('speaking.vocabulary')}</h2>
            {feedback.vocabulary.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{item.english}</div>
                  <div className="text-slate-500">{item.russian}</div>
                </div>
                {savedPhrases.includes(item.english) ? (
                  <Badge tone="green">{t('speaking.saved')}</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await api.post(`/conversations/${conversation.id}/save-phrase`, item);
                      setSavedPhrases((prev) => [...prev, item.english]);
                    }}
                  >
                    {t('speaking.saveToLibrary')}
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}
        {feedback.stats && (
          <Card className="space-y-2">
            <h2 className="font-semibold">{t('speaking.stats')}</h2>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold">{feedback.stats.speakingSeconds}</div>
                <div className="text-slate-500">{t('speaking.statSeconds')}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold">{feedback.stats.userTurns}</div>
                <div className="text-slate-500">{t('speaking.statTurns')}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold">{feedback.stats.avgWordsPerTurn}</div>
                <div className="text-slate-500">{t('speaking.statAvgWords')}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold">{feedback.stats.vocabularyVariety}%</div>
                <div className="text-slate-500">{t('speaking.statVariety')}</div>
              </div>
            </div>
          </Card>
        )}
        <MicroLessonBanner />
        <DailySummaryCard />
        <Button
          className="w-full"
          onClick={() => {
            setConversation(null);
            setFeedback(null);
            setTurns([]);
          }}
        >
          {t('app.done')}
        </Button>
      </div>
    );
  }

  /* ------- Активный разговор ------- */
  if (conversation) {
    const scenario = scenariosData.scenarios.find((s) => s.id === conversation.scenario);
    return (
      <div className="flex h-[calc(100dvh-9rem)] flex-col space-y-3 md:h-[calc(100dvh-6rem)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">{scenario?.titleRu}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge tone="blue">{levelLabel(conversation.level)}</Badge>
              <span>{t('speaking.estimated', { minutes: scenario?.estimatedMinutes ?? 5 })}</span>
              <AiModeBadge mode={aiMode} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPaused(!paused)}>
              {paused ? '▶' : '⏸'} {t('speaking.pause')}
            </Button>
            <Button variant="danger" onClick={finish} disabled={finishing}>
              {t('speaking.finish')}
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
          {turns.map((turn, i) => (
            <div
              key={i}
              className={cx(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px]',
                turn.role === 'assistant'
                  ? 'bg-slate-100 text-slate-800'
                  : 'ml-auto bg-brand-800 text-white',
              )}
            >
              {turn.role === 'assistant' ? (
                <button className="text-left cursor-pointer" onClick={() => speak(turn.text)}>
                  {turn.text}
                </button>
              ) : (
                turn.text
              )}
            </div>
          ))}
          {sending && <div className="text-sm text-slate-400">…</div>}
          {(stt.interim || (stt.listening && stt.transcript)) && (
            <div className="ml-auto max-w-[85%] rounded-2xl bg-brand-100 px-3.5 py-2.5 text-[15px] italic text-brand-900">
              {stt.transcript} {stt.interim}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {hint && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            💡 {t('speaking.hint')}: {hint}
          </div>
        )}

        <div className="space-y-2">
          {stt.supported ? (
            <Button
              variant={stt.listening ? 'danger' : 'primary'}
              className="w-full"
              onClick={() => {
                if (stt.listening) {
                  stt.stop();
                } else {
                  window.speechSynthesis?.cancel();
                  stt.start();
                }
              }}
            >
              {stt.listening ? `⏹ ${t('speaking.micOn')}` : `🎙️ ${t('speaking.micStart')}`}
            </Button>
          ) : (
            <p className="text-sm text-amber-700">{t('speaking.micUnsupported')}</p>
          )}
          {stt.transcript && !stt.listening && (
            <Button
              variant="success"
              className="w-full"
              onClick={() => sendMessage(stt.transcript, stt.seconds)}
            >
              {t('lesson.send')}: “{stt.transcript.slice(0, 50)}”
            </Button>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('speaking.typeAnswer')}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input, 3)}
            />
            <Button variant="secondary" onClick={() => sendMessage(input, 3)}>
              →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ------- Выбор сценария ------- */
  const scenarios = scenariosData.scenarios.filter(
    (s) => modeFilter === 'all' || s.mode === modeFilter,
  );

  return (
    <div className="space-y-4">
      <PageTitle>{t('speaking.title')}</PageTitle>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setModeFilter('all')}
          className={cx(
            'rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer',
            modeFilter === 'all'
              ? 'border-brand-700 bg-brand-800 text-white'
              : 'border-slate-300 bg-white text-slate-600',
          )}
        >
          {t('phrases.filters.all')}
        </button>
        {scenariosData.modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setModeFilter(mode.id)}
            className={cx(
              'rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer',
              modeFilter === mode.id
                ? 'border-brand-700 bg-brand-800 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400',
            )}
          >
            {mode.ru}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="flex flex-col justify-between gap-3">
            <div>
              <div className="font-semibold">{scenario.titleRu}</div>
              <div className="text-sm text-slate-500">{scenario.titleEn}</div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Badge tone="blue">{levelLabel(scenario.level)}</Badge>
                <span className="text-slate-400">
                  {t('speaking.estimated', { minutes: scenario.estimatedMinutes })}
                </span>
              </div>
            </div>
            <Button onClick={() => startConversation(scenario.id)}>
              {t('speaking.startConversation')}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
