import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReviewAnswerEvaluation } from '../api/types';
import { AiModeBadge, Badge, Button, cx } from './ui';
import { speak } from '../lib/voice';

const VERDICT_TONE: Record<
  string,
  'green' | 'amber' | 'red'
> = {
  correct: 'green',
  minor_error: 'amber',
  unnatural: 'amber',
  significant_error: 'red',
  wrong: 'red',
};

/**
 * Содержательный разбор ответа в повторении: ваш ответ → исправление →
 * выделенные ошибочные фрагменты → правило → примеры → естественный вариант.
 * Правило по умолчанию краткое, детали — под кнопкой «Подробнее о правиле».
 */
export function ReviewFeedback({
  evaluation,
  userAnswer,
  onRetry,
  retryLabel,
}: {
  evaluation: ReviewAnswerEvaluation;
  userAnswer: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge tone={VERDICT_TONE[evaluation.verdict] ?? 'amber'}>
          {t(`review.verdicts.${evaluation.verdict}`)}
        </Badge>
        <AiModeBadge mode={evaluation.aiMode} />
      </div>

      {/* Ваш ответ */}
      <div className="text-sm">
        <div className="text-slate-500">{t('review.yourAnswer')}:</div>
        <div className={cx(!evaluation.accepted && 'text-slate-700')}>
          {userAnswer}
        </div>
      </div>

      {/* Исправление с выделенными фрагментами */}
      {evaluation.corrected &&
        evaluation.corrected.toLowerCase() !== userAnswer.toLowerCase() && (
          <div className="text-sm">
            <div className="text-slate-500">{t('review.correction')}:</div>
            <button
              className="font-medium text-emerald-700 cursor-pointer text-left"
              onClick={() => speak(evaluation.corrected)}
            >
              🔊 {evaluation.corrected}
            </button>
          </div>
        )}

      {/* Конкретные ошибочные фрагменты */}
      {evaluation.errors.length > 0 && (
        <div className="space-y-1.5">
          {evaluation.errors.map((err, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-2.5 text-sm">
              <span className="text-red-600 line-through">{err.original}</span>{' '}
              <span className="font-medium text-emerald-700">
                → {err.corrected}
              </span>
              {err.explanation && (
                <div className="text-slate-500">{err.explanation}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Правило (кратко) + подробнее */}
      {evaluation.rule && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm">
          <div className="font-medium text-brand-900">{t('review.rule')}</div>
          <p className="text-slate-700">{evaluation.rule}</p>
          {evaluation.examples.length > 0 && (
            <button
              className="mt-1 text-xs text-brand-700 hover:underline cursor-pointer"
              onClick={() => setShowDetails(!showDetails)}
            >
              {t('review.ruleDetails')}
            </button>
          )}
          {showDetails && evaluation.examples.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-slate-500">
                {t('review.moreExamples')}:
              </div>
              {evaluation.examples.map((ex, i) => (
                <button
                  key={i}
                  className="block text-left italic text-slate-600 cursor-pointer"
                  onClick={() => speak(ex)}
                >
                  🔊 {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Естественный вариант */}
      {evaluation.natural &&
        evaluation.natural.toLowerCase() !==
          evaluation.corrected.toLowerCase() && (
          <div className="text-sm">
            <span className="text-slate-500">{t('review.natural')}: </span>
            {evaluation.natural}
          </div>
        )}

      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="w-full">
          🔁 {retryLabel ?? t('review.tryAgain')}
        </Button>
      )}
    </div>
  );
}
