import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { GrammarRuleDetail, GrammarRuleExample } from '../api/types';
import { normalizeEn } from '../lib/normalizeEn';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageTitle,
  Spinner,
  Textarea,
  levelLabel,
} from '../components/ui';

const EXAMPLE_TONE: Record<GrammarRuleExample['exampleType'], 'green' | 'red' | 'blue' | 'slate' | 'amber'> = {
  CORRECT: 'green',
  INCORRECT: 'red',
  CONTRAST: 'blue',
  CONTEXT: 'slate',
  EXCEPTION: 'amber',
};

function ExampleCard({ example }: { example: GrammarRuleExample }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <Badge tone={EXAMPLE_TONE[example.exampleType]}>
        {t(`grammar.exampleType.${example.exampleType}`)}
      </Badge>
      {example.exampleType === 'INCORRECT' && example.correction ? (
        <div className="text-[15px]">
          <span className="text-red-600 line-through">{example.sentence}</span>{' '}
          <span className="font-medium text-emerald-700">{example.correction}</span>
        </div>
      ) : (
        <p className="text-[15px]">{example.sentence}</p>
      )}
      {example.explanation && <p className="text-sm text-slate-500">{example.explanation}</p>}
    </div>
  );
}

interface ExerciseResult {
  exerciseId: string;
  correct: boolean;
  correctAnswer: string;
  given: string;
}

function scoreExercises(
  rule: GrammarRuleDetail,
  answers: Record<string, string>,
): { results: ExerciseResult[]; score: number; total: number } {
  let score = 0;
  const results = rule.exerciseTemplates.map((ex) => {
    const given = answers[ex.id] ?? '';
    const isCorrect = normalizeEn(given) === normalizeEn(ex.answer);
    if (isCorrect) score += 1;
    return {
      exerciseId: ex.id,
      correct: isCorrect,
      correctAnswer: ex.answer,
      given,
    };
  });
  return { results, score, total: rule.exerciseTemplates.length };
}

export default function GrammarRulePage() {
  const { ruleCode } = useParams<{ ruleCode: string }>();
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ results: ExerciseResult[]; score: number; total: number } | null>(
    null,
  );

  const {
    data: rule,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['grammar-rule', ruleCode],
    queryFn: () => api.get<GrammarRuleDetail>(`/grammar/rules/${ruleCode}`),
    enabled: !!ruleCode,
  });

  const examplesByType = useMemo(() => {
    if (!rule) return [];
    return rule.examples;
  }, [rule]);

  if (isLoading) return <Spinner />;

  if (isError || !rule) {
    return (
      <div className="space-y-4">
        <EmptyState>{t('grammar.notFound')}</EmptyState>
        <Link to="/grammar">
          <Button variant="secondary">{t('grammar.backToList')}</Button>
        </Link>
      </div>
    );
  }

  function handleCheck() {
    if (!rule) return;
    setResult(scoreExercises(rule, answers));
  }

  function handleRetry() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className="space-y-4">
      <PageTitle>{rule.titleRu}</PageTitle>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{levelLabel(rule.cefrLevel)}</Badge>
            {rule.titleEn && <span className="text-xs text-slate-400">{rule.titleEn}</span>}
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500">{rule.shortExplanationRu}</p>
        <p className="whitespace-pre-line text-[15px]">{rule.explanationRu}</p>
        {rule.formula && (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700">
            {rule.formula}
          </div>
        )}
      </Card>

      {examplesByType.length > 0 && (
        <Card className="space-y-3">
          <div className="text-sm font-medium text-slate-500">{t('grammar.examplesTitle')}</div>
          {examplesByType.map((example, i) => (
            <ExampleCard key={i} example={example} />
          ))}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="text-sm font-medium text-slate-500">{t('grammar.exercisesTitle')}</div>
        {rule.exerciseTemplates.map((ex, i) => {
          const exResult = result?.results.find((r) => r.exerciseId === ex.id);
          return (
            <div key={ex.id} className="space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
              <div className="text-[15px]">
                {i + 1}.{' '}
                {ex.type === 'correct_sentence' ? (
                  <>
                    {t('grammar.correctSentencePrompt')}: <span className="italic">{ex.prompt}</span>
                  </>
                ) : (
                  ex.prompt
                )}
              </div>
              {ex.type === 'choice' && ex.options ? (
                <div className="flex flex-wrap gap-2">
                  {ex.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={!!result}
                      onClick={() => setAnswers((prev) => ({ ...prev, [ex.id]: opt }))}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        answers[ex.id] === opt
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <Textarea
                  rows={1}
                  disabled={!!result}
                  value={answers[ex.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                  placeholder={t('grammar.yourAnswer') as string}
                />
              )}
              {exResult && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge tone={exResult.correct ? 'green' : 'red'}>
                    {exResult.correct ? '✓' : '✗'}
                  </Badge>
                  {!exResult.correct && (
                    <span className="text-slate-500">
                      {t('grammar.correctAnswerLabel')}: {exResult.correctAnswer}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!result ? (
          <Button onClick={handleCheck}>{t('grammar.checkAnswers')}</Button>
        ) : (
          <div className="space-y-2">
            <p className="font-medium text-slate-900">
              {t('grammar.result', { score: result.score, total: result.total })}
            </p>
            <p className="text-sm text-slate-600">
              {result.score === result.total ? t('grammar.resultGood') : t('grammar.resultRetry')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleRetry}>
                {t('grammar.retry')}
              </Button>
              <Link to="/grammar">
                <Button variant="ghost">{t('grammar.backToList')}</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
