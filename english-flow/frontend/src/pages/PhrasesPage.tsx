import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { UserPhrase } from '../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageTitle,
  Spinner,
  cx,
  levelLabel,
} from '../components/ui';
import { speak } from '../lib/voice';

const FILTERS = ['all', 'new', 'learning', 'mastered', 'difficult', 'professional', 'due'] as const;

export default function PhrasesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEnglish, setNewEnglish] = useState('');
  const [newRussian, setNewRussian] = useState('');
  const [newCategory, setNewCategory] = useState('everyday');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['phrase-categories'],
    queryFn: () => api.get<{ id: string; ru: string }[]>('/phrases/categories'),
  });
  const { data: phrases, isLoading } = useQuery({
    queryKey: ['phrases', filter, search],
    queryFn: () =>
      api.get<UserPhrase[]>(
        `/phrases?${filter !== 'all' ? `filter=${filter}&` : ''}${
          search ? `search=${encodeURIComponent(search)}` : ''
        }`,
      ),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api.post('/phrases', {
        english: newEnglish,
        russian: newRussian,
        category: newCategory,
      }),
    onSuccess: () => {
      setNewEnglish('');
      setNewRussian('');
      setShowAdd(false);
      queryClient.invalidateQueries({ queryKey: ['phrases'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/phrases/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['phrases'] }),
  });

  const categoryName = (id: string) =>
    categories?.find((c) => c.id === id)?.ru ?? id;

  return (
    <div className="space-y-4">
      <PageTitle
        actions={
          <Button variant="secondary" onClick={() => setShowAdd(!showAdd)}>
            + {t('phrases.add')}
          </Button>
        }
      >
        {t('phrases.title')}
      </PageTitle>

      {showAdd && (
        <Card className="space-y-3">
          <Input
            placeholder={t('phrases.english')}
            value={newEnglish}
            onChange={(e) => setNewEnglish(e.target.value)}
          />
          <Input
            placeholder={t('phrases.russian')}
            value={newRussian}
            onChange={(e) => setNewRussian(e.target.value)}
          />
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.ru}
              </option>
            ))}
          </select>
          <Button
            disabled={!newEnglish.trim() || !newRussian.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {t('app.save')}
          </Button>
        </Card>
      )}

      <Input
        placeholder={t('phrases.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              'rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer',
              filter === f
                ? 'border-brand-700 bg-brand-800 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400',
            )}
          >
            {t(`phrases.filters.${f}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !phrases || phrases.length === 0 ? (
        <EmptyState>{t('phrases.empty')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {phrases.map((up) => (
            <Card key={up.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <button
                  className="text-left font-semibold text-brand-900 cursor-pointer"
                  onClick={() => speak(up.phrase.englishText)}
                >
                  🔊 {up.phrase.englishText}
                </button>
                <Badge
                  tone={
                    up.status === 'MASTERED'
                      ? 'green'
                      : up.status === 'DIFFICULT'
                        ? 'red'
                        : up.status === 'LEARNING'
                          ? 'blue'
                          : 'slate'
                  }
                >
                  {t(`phrases.status.${up.status}`)}
                </Badge>
              </div>
              <div className="text-slate-600">{up.phrase.russianTranslation}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{categoryName(up.phrase.category)}</span>
                <span>·</span>
                <span>{levelLabel(up.phrase.cefrLevel)}</span>
                <span>·</span>
                <span>{t(`phrases.source.${up.phrase.source}` as any, up.phrase.source)}</span>
                {up.nextReviewAt && (
                  <>
                    <span>·</span>
                    <span>
                      {t('phrases.nextReview')}:{' '}
                      {new Date(up.nextReviewAt).toLocaleDateString('ru-RU')}
                    </span>
                  </>
                )}
              </div>
              {expanded === up.id && (
                <div className="space-y-1 pt-1 text-sm">
                  {up.phrase.pronunciationHint && (
                    <div className="text-slate-400">[{up.phrase.pronunciationHint}]</div>
                  )}
                  {up.phrase.exampleSentence && (
                    <div className="italic text-slate-600">
                      “{up.phrase.exampleSentence}”
                    </div>
                  )}
                  {up.personalExample && (
                    <div className="text-slate-600">
                      {t('phrases.personalExample')}: {up.personalExample}
                    </div>
                  )}
                  <button
                    className="text-red-600 hover:underline cursor-pointer"
                    onClick={() => removeMutation.mutate(up.id)}
                  >
                    {t('app.delete')}
                  </button>
                </div>
              )}
              <button
                className="text-xs text-brand-700 hover:underline cursor-pointer"
                onClick={() => setExpanded(expanded === up.id ? null : up.id)}
              >
                {expanded === up.id ? '▲' : '▼'}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
