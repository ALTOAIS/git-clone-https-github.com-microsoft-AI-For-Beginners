import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Lesson, UploadedMaterial } from '../api/types';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  Input,
  PageTitle,
  Spinner,
  Textarea,
  cx,
  levelLabel,
} from '../components/ui';

const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const FOCUS_SKILLS = ['speaking', 'vocabulary', 'grammar', 'listening'];

export default function GeneratorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const materialParam = searchParams.get('material');

  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('A2');
  const [duration, setDuration] = useState(15);
  const [phraseCount, setPhraseCount] = useState(5);
  const [focusSkill, setFocusSkill] = useState('speaking');
  const [context, setContext] = useState<'professional' | 'everyday'>('professional');
  const [materialId, setMaterialId] = useState(materialParam ?? '');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Lesson | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: materials } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get<UploadedMaterial[]>('/materials'),
  });

  useEffect(() => {
    if (draftId && !draft) {
      api.get<Lesson>(`/lessons/${draftId}`).then((lesson) => {
        setDraft(lesson);
        setEditTitle(lesson.title);
        setEditObjective(lesson.objective ?? '');
      });
    }
  }, [draftId, draft]);

  const generate = async () => {
    if (!topic.trim() && !draft) return;
    setGenerating(true);
    try {
      const lesson = await api.post<Lesson>('/lessons/generate', {
        topic: topic.trim() || draft?.topic,
        level,
        durationMinutes: duration,
        phraseCount,
        focusSkill,
        context,
        materialId: materialId || undefined,
      });
      // Старый черновик удаляем, чтобы не плодить дубли
      if (draft && draft.status === 'DRAFT') {
        await api.delete(`/lessons/${draft.id}`).catch(() => undefined);
      }
      setDraft(lesson);
      setEditTitle(lesson.title);
      setEditObjective(lesson.objective ?? '');
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async (status: 'READY' | 'DRAFT') => {
    if (!draft) return null;
    setSaving(true);
    try {
      return await api.patch<Lesson>(`/lessons/${draft.id}`, {
        title: editTitle,
        objective: editObjective,
        status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t('generator.title')}</PageTitle>

      <Card className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-500">{t('generator.topic')}</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('generator.topicPlaceholder')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-slate-500">{t('generator.level')}</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {levelLabel(l)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">
              {t('generator.duration')}
            </label>
            <Input
              type="number"
              min={5}
              max={60}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">
              {t('generator.phraseCount')}
            </label>
            <Input
              type="number"
              min={3}
              max={10}
              value={phraseCount}
              onChange={(e) => setPhraseCount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">
              {t('generator.focusSkill')}
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
              value={focusSkill}
              onChange={(e) => setFocusSkill(e.target.value)}
            >
              {FOCUS_SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {t(`generator.focusSkills.${skill}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">{t('generator.context')}:</span>
          {(['professional', 'everyday'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setContext(c)}
              className={cx(
                'rounded-xl border px-3 py-1.5 text-sm cursor-pointer',
                context === c
                  ? 'border-brand-700 bg-brand-800 text-white'
                  : 'border-slate-300 bg-white text-slate-600',
              )}
            >
              {c === 'professional'
                ? t('generator.contextProfessional')
                : t('generator.contextEveryday')}
            </button>
          ))}
        </div>
        {materials && materials.length > 0 && (
          <div>
            <label className="mb-1 block text-sm text-slate-500">
              {t('generator.fromMaterial')}
            </label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              <option value="">{t('generator.noMaterial')}</option>
              {materials
                .filter((m) => m.processingStatus === 'READY')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.filename}
                  </option>
                ))}
            </select>
          </div>
        )}
        <Button
          className="w-full"
          disabled={generating || (!topic.trim() && !draft)}
          onClick={generate}
        >
          {generating ? t('generator.generating') : `✨ ${t('generator.generate')}`}
        </Button>
      </Card>

      {draft && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{t('generator.preview')}</h2>
            <Badge tone="amber">{t('lesson.draftBadge')}</Badge>
            <AiModeBadge mode={draft.aiMode} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">
              {t('generator.editTitle')}
            </label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">
              {t('generator.editObjective')}
            </label>
            <Textarea
              rows={2}
              value={editObjective}
              onChange={(e) => setEditObjective(e.target.value)}
            />
          </div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="font-medium">{t('lesson.stageNew')}:</div>
            <ul className="space-y-1">
              {draft.contentJson.newPhrases.map((phrase, i) => (
                <li key={i}>
                  <span className="font-medium text-brand-900">{phrase.english}</span>
                  {' — '}
                  {phrase.russian}
                </li>
              ))}
            </ul>
            {draft.contentJson.grammarPoint && (
              <div>
                <span className="font-medium">{t('lesson.grammarTitle')}: </span>
                {draft.contentJson.grammarPoint.title}
              </div>
            )}
            <div>
              <span className="font-medium">{t('lesson.stageTranslate')}: </span>
              {draft.contentJson.translationTasks.length}
            </div>
            <div>
              <span className="font-medium">{t('lesson.stageDialogue')}: </span>
              {draft.contentJson.dialogue.title}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={generate} disabled={generating}>
              🔄 {t('generator.regenerate')}
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                const savedLesson = await saveDraft('READY');
                if (savedLesson) navigate('/lessons');
              }}
            >
              {t('generator.saveLesson')}
            </Button>
            <Button
              variant="success"
              disabled={saving}
              onClick={async () => {
                const savedLesson = await saveDraft('READY');
                if (savedLesson) navigate(`/lessons/${savedLesson.id}`);
              }}
            >
              ▶ {t('generator.startLesson')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await api.delete(`/lessons/${draft.id}`);
                setDraft(null);
              }}
            >
              {t('generator.deleteDraft')}
            </Button>
          </div>
        </Card>
      )}
      {draftId && !draft && <Spinner />}
    </div>
  );
}
