import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  ExtractedPhrasesResult,
  FallbackReason,
  UploadedMaterial,
} from '../api/types';
import {
  AiModeBadge,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageTitle,
  Spinner,
  Textarea,
} from '../components/ui';

export default function MaterialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteName, setPasteName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [busyId, setBusyId] = useState('');
  const [extracted, setExtracted] = useState<
    (ExtractedPhrasesResult & { materialId: string; selected: number[] }) | null
  >(null);
  const [simplified, setSimplified] = useState<{
    materialId: string;
    text: string;
    aiMode: 'llm' | 'fallback';
    fallbackReason?: FallbackReason;
  } | null>(null);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get<UploadedMaterial[]>('/materials'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['materials'] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.upload('/materials/upload', form);
    },
    onSuccess: invalidate,
  });

  const pasteMutation = useMutation({
    mutationFn: () =>
      api.post('/materials/text', { filename: pasteName, text: pasteText }),
    onSuccess: () => {
      setPasteMode(false);
      setPasteName('');
      setPasteText('');
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/materials/${id}`),
    onSuccess: invalidate,
  });

  const extractPhrases = async (material: UploadedMaterial) => {
    setBusyId(material.id);
    try {
      const result = await api.post<ExtractedPhrasesResult>(
        `/materials/${material.id}/extract-phrases`,
        { count: 10 },
      );
      setExtracted({
        ...result,
        materialId: material.id,
        selected: result.phrases.map((_, i) => i),
      });
      setSimplified(null);
    } finally {
      setBusyId('');
    }
  };

  const simplify = async (material: UploadedMaterial) => {
    setBusyId(material.id);
    try {
      const result = await api.post<{
        simplified: string;
        aiMode: 'llm' | 'fallback';
        fallbackReason?: FallbackReason;
      }>(`/materials/${material.id}/simplify`);
      setSimplified({
        materialId: material.id,
        text: result.simplified,
        aiMode: result.aiMode,
        fallbackReason: result.fallbackReason,
      });
      setExtracted(null);
    } finally {
      setBusyId('');
    }
  };

  const saveSelectedPhrases = async () => {
    if (!extracted) return;
    await api.post('/phrases/bulk', {
      phrases: extracted.selected.map((i) => ({
        english: extracted.phrases[i].english,
        russian: extracted.phrases[i].russian,
        category: extracted.phrases[i].category ?? 'work',
        example: extracted.phrases[i].example,
        source: 'UPLOADED_DOCUMENT',
      })),
    });
    setExtracted(null);
    queryClient.invalidateQueries({ queryKey: ['phrases'] });
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t('materials.title')}</PageTitle>

      <Card className="space-y-3">
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ {t('materials.privacyWarning')}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = '';
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            📄 {t('materials.upload')}
          </Button>
          <Button variant="secondary" onClick={() => setPasteMode(!pasteMode)}>
            {t('materials.pasteText')}
          </Button>
        </div>
        <p className="text-xs text-slate-400">{t('materials.supported')}</p>
        {pasteMode && (
          <div className="space-y-2">
            <Input
              placeholder={t('materials.filename')}
              value={pasteName}
              onChange={(e) => setPasteName(e.target.value)}
            />
            <Textarea
              rows={5}
              placeholder={t('materials.textPlaceholder')}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <Button
              disabled={!pasteText.trim() || pasteMutation.isPending}
              onClick={() => pasteMutation.mutate()}
            >
              {t('app.save')}
            </Button>
          </div>
        )}
      </Card>

      {isLoading ? (
        <Spinner />
      ) : !materials || materials.length === 0 ? (
        <EmptyState>{t('materials.empty')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <Card key={material.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{material.filename}</div>
                  <div className="text-xs text-slate-400">
                    {material.fileType.toUpperCase()} ·{' '}
                    {new Date(material.createdAt).toLocaleDateString('ru-RU')} ·{' '}
                    {material.textLength} симв.
                  </div>
                </div>
                <Badge
                  tone={
                    material.processingStatus === 'READY'
                      ? 'green'
                      : material.processingStatus === 'FAILED'
                        ? 'red'
                        : 'slate'
                  }
                >
                  {t(`materials.status.${material.processingStatus}`)}
                </Badge>
              </div>
              {material.processingStatus === 'READY' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={busyId === material.id}
                    onClick={() => extractPhrases(material)}
                  >
                    {t('materials.extractPhrases')}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busyId === material.id}
                    onClick={() => simplify(material)}
                  >
                    {t('materials.simplify')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/generator?material=${material.id}`)}
                  >
                    {t('materials.createLesson')}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => deleteMutation.mutate(material.id)}
                    title={t('materials.deleteMaterial')}
                  >
                    {t('app.delete')}
                  </Button>
                </div>
              )}
              {material.processingStatus !== 'READY' && (
                <Button variant="danger" onClick={() => deleteMutation.mutate(material.id)}>
                  {t('app.delete')}
                </Button>
              )}

              {extracted?.materialId === material.id && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {t('materials.extractedPreview')}
                    </span>
                    <AiModeBadge mode={extracted.aiMode} fallbackReason={extracted.fallbackReason} />
                  </div>
                  {extracted.phrases.map((phrase, i) => (
                    <label key={i} className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 accent-brand-700"
                        checked={extracted.selected.includes(i)}
                        onChange={(e) =>
                          setExtracted({
                            ...extracted,
                            selected: e.target.checked
                              ? [...extracted.selected, i]
                              : extracted.selected.filter((j) => j !== i),
                          })
                        }
                      />
                      <span>
                        <span className="font-medium text-brand-900">{phrase.english}</span>
                        {' — '}
                        {phrase.russian}
                      </span>
                    </label>
                  ))}
                  <Button
                    disabled={extracted.selected.length === 0}
                    onClick={saveSelectedPhrases}
                  >
                    {t('materials.saveSelected')} ({extracted.selected.length})
                  </Button>
                </div>
              )}

              {simplified?.materialId === material.id && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('materials.simplified')}</span>
                    <AiModeBadge mode={simplified.aiMode} fallbackReason={simplified.fallbackReason} />
                  </div>
                  <p className="text-sm text-slate-700">{simplified.text}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
