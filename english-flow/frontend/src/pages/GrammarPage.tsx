import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { GrammarRuleListItem } from '../api/types';
import { Badge, Button, Card, EmptyState, PageTitle, Spinner, levelLabel } from '../components/ui';

function GrammarRuleCard({ rule }: { rule: GrammarRuleListItem }) {
  const { t } = useTranslation();
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{rule.titleRu}</span>
          <Badge tone="blue">{levelLabel(rule.cefrLevel)}</Badge>
        </div>
        {rule.titleEn && <p className="mt-0.5 text-xs text-slate-400">{rule.titleEn}</p>}
        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{rule.shortExplanationRu}</p>
      </div>
      <Link to={`/grammar/${rule.ruleCode}`}>
        <Button variant="primary">{t('grammar.study')}</Button>
      </Link>
    </Card>
  );
}

export default function GrammarPage() {
  const { t } = useTranslation();
  const {
    data: rules,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['grammar-rules'],
    queryFn: () => api.get<GrammarRuleListItem[]>('/grammar/rules'),
  });

  return (
    <div className="space-y-4">
      <PageTitle>{t('grammar.title')}</PageTitle>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState>{t('grammar.loadError')}</EmptyState>
      ) : !rules || rules.length === 0 ? (
        <EmptyState>{t('grammar.empty')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <GrammarRuleCard key={rule.ruleCode} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}
