import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageIssueInfo } from '../api/types';
import { Button } from './ui';

/**
 * Показывается вместо обычного разбора ответа, когда ответ определён как
 * русский/смешанный/пустой/нераспознанный — раздел 3 ТЗ. Не увеличивает
 * счётчик ошибок и не выдаёт ложный вердикт по грамматике.
 */
export function LanguageIssueNotice({ issue }: { issue: LanguageIssueInfo }) {
  const { t } = useTranslation();
  const [showExample, setShowExample] = useState(false);

  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="font-medium text-amber-900">{issue.message}</p>
      {issue.hint && <p className="text-sm text-amber-800">{issue.hint}</p>}
      {issue.example && (
        <div>
          {showExample ? (
            <p className="text-sm font-medium text-emerald-700">{issue.example}</p>
          ) : (
            <Button variant="ghost" onClick={() => setShowExample(true)}>
              {t('languageIssue.showExample')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
