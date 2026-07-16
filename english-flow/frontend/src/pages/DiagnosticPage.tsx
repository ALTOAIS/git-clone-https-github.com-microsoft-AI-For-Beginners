import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { DiagnosticResult, DiagnosticTest } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  ProgressBar,
  Spinner,
  Textarea,
  cx,
  levelLabel,
} from '../components/ui';
import { speak, useSpeechRecognition } from '../lib/voice';

type SectionId =
  | 'vocabulary'
  | 'grammar'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'speaking';

const SECTION_ORDER: SectionId[] = [
  'vocabulary',
  'grammar',
  'reading',
  'listening',
  'writing',
  'speaking',
];

function SpeakingTask({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const stt = useSpeechRecognition();
  const current = stt.listening ? stt.transcript || stt.interim : value;

  return (
    <Card className="space-y-3">
      <p className="font-medium">{prompt}</p>
      {stt.supported ? (
        <Button
          variant={stt.listening ? 'danger' : 'secondary'}
          onClick={() => {
            if (stt.listening) {
              stt.stop();
              if (stt.transcript) onChange(stt.transcript);
            } else {
              stt.start();
            }
          }}
        >
          {stt.listening ? `⏹ ${t('diagnostic.stopRecording')}` : `🎙️ ${t('diagnostic.recordAnswer')}`}
        </Button>
      ) : (
        <p className="text-sm text-amber-700">{t('speaking.micUnsupported')}</p>
      )}
      {stt.listening && stt.interim && (
        <p className="text-sm italic text-slate-500">{stt.interim}</p>
      )}
      {!stt.listening && stt.transcript && stt.transcript !== value && (
        <Button variant="ghost" onClick={() => onChange(stt.transcript)}>
          {t('app.save')}
        </Button>
      )}
      <div>
        <p className="mb-1 text-sm text-slate-500">{t('diagnostic.typeFallback')}</p>
        <Textarea
          rows={2}
          value={current}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Card>
  );
}

export default function DiagnosticPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { data: test, isLoading } = useQuery({
    queryKey: ['diagnostic-test'],
    queryFn: () => api.get<DiagnosticTest>('/diagnostics/test'),
  });

  const [sectionIndex, setSectionIndex] = useState(0);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, number>>({});
  const [writingAnswers, setWritingAnswers] = useState<Record<string, string>>({});
  const [speakingTranscripts, setSpeakingTranscripts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const section = SECTION_ORDER[sectionIndex];
  const sectionQuestions = useMemo(
    () => (test?.choiceQuestions ?? []).filter((q) => q.section === section),
    [test, section],
  );
  const sectionOpenTasks = useMemo(
    () => (test?.openTasks ?? []).filter((task) => task.section === section),
    [test, section],
  );

  if (isLoading || !test) return <Spinner />;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t('diagnostic.resultTitle')}</h1>
          <AiModeBadge mode={result.aiMode} fallbackReason={result.fallbackReason} />
        </div>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg">{t('diagnostic.overall')}</span>
            <span className="text-3xl font-bold text-brand-800">
              {levelLabel(result.overall)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(result.levels).map(([skill, level]) => (
              <div key={skill} className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-500">
                  {t(`diagnostic.sections.${skill}`)}
                </div>
                <div className="text-xl font-bold">{levelLabel(level)}</div>
              </div>
            ))}
          </div>
          {result.summary && <p className="text-slate-600">{result.summary}</p>}
        </Card>
        <Card className="space-y-2">
          <h2 className="font-semibold">{t('diagnostic.strengths')}</h2>
          <ul className="list-disc pl-5 text-slate-700">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h2 className="pt-2 font-semibold">{t('diagnostic.weaknesses')}</h2>
          <ul className="list-disc pl-5 text-slate-700">
            {result.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Card>
        {result.recurringErrors.length > 0 && (
          <Card className="space-y-3">
            <h2 className="font-semibold">{t('diagnostic.recurringErrors')}</h2>
            {result.recurringErrors.map((error, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="text-red-600 line-through">{error.original}</div>
                <div className="font-medium text-emerald-700">{error.corrected}</div>
                <div className="text-slate-500">{error.explanation}</div>
              </div>
            ))}
          </Card>
        )}
        <Card className="space-y-2 text-sm text-slate-600">
          <div>
            <span className="font-medium text-slate-800">
              {t('diagnostic.recommendedTrack')}:{' '}
            </span>
            {result.suggestedTrack}
          </div>
          <div>
            <span className="font-medium text-slate-800">
              {t('diagnostic.recommendedMinutes')}:{' '}
            </span>
            {result.recommendedDailyMinutes} {t('app.minutes_short')}
          </div>
          <p>{result.estimatedPath}</p>
        </Card>
        <Button
          className="w-full"
          onClick={async () => {
            await refreshUser();
            navigate('/');
          }}
        >
          {t('diagnostic.toDashboard')}
        </Button>
      </div>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    try {
      const response = await api.post<DiagnosticResult>('/diagnostics/submit', {
        choiceAnswers,
        writingAnswers,
        speakingTranscripts,
      });
      setResult(response);
    } finally {
      setSubmitting(false);
    }
  };

  const isLastSection = sectionIndex === SECTION_ORDER.length - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">{t('diagnostic.title')}</h1>
      <div className="flex items-center gap-3">
        <ProgressBar value={((sectionIndex + 1) / SECTION_ORDER.length) * 100} className="flex-1" />
        <Badge tone="blue">{t(`diagnostic.sections.${section}`)}</Badge>
      </div>

      {sectionQuestions.map((question) => (
        <Card key={question.id} className="space-y-3">
          {question.passage && (
            <p className="rounded-xl bg-slate-50 p-3 text-slate-700">
              {question.passage}
            </p>
          )}
          {question.audioText && (
            <Button variant="secondary" onClick={() => speak(question.audioText!)}>
              🔊 {t('diagnostic.listen')}
            </Button>
          )}
          <p className="font-medium">{question.prompt}</p>
          <div className="grid gap-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  setChoiceAnswers({ ...choiceAnswers, [question.id]: index })
                }
                className={cx(
                  'rounded-xl border px-3.5 py-2.5 text-left text-[15px] cursor-pointer transition-colors',
                  choiceAnswers[question.id] === index
                    ? 'border-brand-700 bg-brand-50 font-medium text-brand-900'
                    : 'border-slate-200 bg-white hover:border-brand-300',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>
      ))}

      {section === 'writing' &&
        sectionOpenTasks.map((task) => (
          <Card key={task.id} className="space-y-2">
            <p className="font-medium">{task.prompt}</p>
            <Textarea
              rows={3}
              value={writingAnswers[task.id] ?? ''}
              onChange={(e) =>
                setWritingAnswers({ ...writingAnswers, [task.id]: e.target.value })
              }
              placeholder="Write in English…"
            />
          </Card>
        ))}

      {section === 'speaking' &&
        sectionOpenTasks.map((task) => (
          <SpeakingTask
            key={task.id}
            prompt={task.prompt}
            value={speakingTranscripts[task.id] ?? ''}
            onChange={(value) =>
              setSpeakingTranscripts({ ...speakingTranscripts, [task.id]: value })
            }
          />
        ))}

      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={sectionIndex === 0}
          onClick={() => setSectionIndex(sectionIndex - 1)}
        >
          {t('app.back')}
        </Button>
        {isLastSection ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t('diagnostic.submitting') : t('diagnostic.submit')}
          </Button>
        ) : (
          <Button onClick={() => setSectionIndex(sectionIndex + 1)}>
            {t('app.next')}
          </Button>
        )}
      </div>
    </div>
  );
}
