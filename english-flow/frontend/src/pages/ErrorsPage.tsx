import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ErrorRecord } from '../api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageTitle,
  Spinner,
} from '../components/ui';

const STATUS_TONES: Record<string, 'slate' | 'blue' | 'green' | 'amber' | 'red'> = {
  NEW: 'red',
  PRACTICING: 'amber',
  IMPROVING: 'blue',
  RESOLVED: 'green',
  REPEATED: 'red',
};

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
      <PageTitle
        actions={
          <Link to="/translate?mode=errors">
            <Button>{t('errors.practice')}</Button>
          </Link>
        }
      >
        {t('errors.title')}
      </PageTitle>

      <div className="flex flex-wrap gap-2">
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
          {errors.map((error) => (
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
              </div>
              <div>
                <div className="text-sm text-slate-500">{t('errors.yourVersion')}:</div>
                <div className="text-red-600 line-through">{error.originalText}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{t('errors.correctVersion')}:</div>
                <div className="font-medium text-emerald-700">{error.correctedText}</div>
              </div>
              {error.explanation && (
                <p className="text-sm text-slate-600">{error.explanation}</p>
              )}
              {error.personalExample && (
                <p className="text-sm italic text-slate-500">
                  {t('errors.personalExample')}: “{error.personalExample}”
                </p>
              )}
              {error.status !== 'RESOLVED' && (
                <Button
                  variant="ghost"
                  onClick={() => resolveMutation.mutate(error.id)}
                >
                  ✓ {t('errors.markResolved')}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
