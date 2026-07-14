import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ProgressOverview } from '../api/types';
import {
  Badge,
  Button,
  Card,
  PageTitle,
  Spinner,
  StatTile,
  cx,
  levelLabel,
} from '../components/ui';
import { useSpeechRecognition } from '../lib/voice';

const CEFR_ORDER = ['A1', 'A1_PLUS', 'A2', 'A2_PLUS', 'B1', 'B1_PLUS', 'B2', 'C1'];
const SKILLS = ['vocabulary', 'grammar', 'speaking', 'listening', 'reading', 'writing'] as const;

function SkillBar({ skill, level }: { skill: string; level: string }) {
  const { t } = useTranslation();
  const percent = ((CEFR_ORDER.indexOf(level) + 1) / CEFR_ORDER.length) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{t(`diagnostic.sections.${skill}`)}</span>
        <span className="font-semibold">{levelLabel(level)}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200">
        <div
          className="h-2.5 rounded-full bg-brand-600"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function BenchmarkRecorder({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const stt = useSpeechRecognition();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!stt.transcript) return;
    setSaving(true);
    try {
      await api.post('/progress/benchmark', {
        prompt: t('progress.benchmarkPrompt'),
        transcript: stt.transcript,
        durationSec: stt.seconds,
      });
      stt.reset();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">{t('progress.benchmarkPrompt')}</p>
      {stt.supported ? (
        <Button
          variant={stt.listening ? 'danger' : 'secondary'}
          onClick={() => (stt.listening ? stt.stop() : stt.start())}
        >
          {stt.listening
            ? `⏹ ${t('diagnostic.stopRecording')}`
            : `🎙️ ${t('progress.recordBenchmark')}`}
        </Button>
      ) : (
        <p className="text-sm text-amber-700">{t('speaking.micUnsupported')}</p>
      )}
      {(stt.transcript || stt.interim) && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm">{stt.transcript || stt.interim}</div>
      )}
      {stt.transcript && !stt.listening && (
        <Button onClick={save} disabled={saving}>
          {t('app.save')}
        </Button>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.get<ProgressOverview>('/progress'),
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-4">
      <PageTitle>{t('progress.title')}</PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('progress.level')} value={levelLabel(data.currentLevel)} />
        <StatTile label={t('today.streak')} value={`🔥 ${data.streakDays}`} />
        <StatTile label={t('progress.activePhrases')} value={data.activePhrases} />
        <StatTile label={t('progress.masteredPhrases')} value={data.masteredPhrases} />
        <StatTile
          label={t('progress.accuracy')}
          value={data.reviewAccuracy !== null ? `${data.reviewAccuracy}%` : '—'}
        />
        <StatTile
          label={t('progress.speakingWeek')}
          value={`${data.speakingMinutesWeek} ${t('app.minutes_short')}`}
        />
        <StatTile label={t('progress.dialogues')} value={data.completedDialogues} />
        <StatTile label={t('progress.lessons')} value={data.completedLessons} />
      </div>

      {data.skillProfile && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t('progress.skills')}</h2>
          {SKILLS.map((skill) => (
            <SkillBar key={skill} skill={skill} level={data.skillProfile![skill]} />
          ))}
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="font-semibold">{t('progress.achievements')}</h2>
        <div className="space-y-1.5">
          {data.achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={cx(
                'flex items-center gap-2 text-[15px]',
                achievement.achieved ? 'text-slate-800' : 'text-slate-400',
              )}
            >
              <span>{achievement.achieved ? '✅' : '⬜'}</span>
              {achievement.title}
            </div>
          ))}
        </div>
      </Card>

      {data.topErrors.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-semibold">{t('progress.recurringErrors')}</h2>
          {data.topErrors.map((error) => (
            <div key={error.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <span className="text-red-600 line-through">{error.originalText}</span>{' '}
              <span className="font-medium text-emerald-700">{error.correctedText}</span>
              <Badge tone="slate">
                {' '}
                ×{error.occurrenceCount}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('progress.benchmarks')}</h2>
        {data.benchmarks.length > 0 && (
          <div className="space-y-2">
            {data.benchmarks.map((benchmark) => (
              <div key={benchmark.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{benchmark.month}</span>
                  <span className="text-slate-400">
                    {benchmark.wordCount} {t('progress.words')} ·{' '}
                    {benchmark.durationSec} {t('lesson.sec')}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{benchmark.transcript}</p>
              </div>
            ))}
          </div>
        )}
        <BenchmarkRecorder
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['progress'] })}
        />
      </Card>
    </div>
  );
}
