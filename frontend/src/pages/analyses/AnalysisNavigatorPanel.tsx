import { CommentOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Popover, Segmented, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../api/endpoints';
import type { AnalysisChecklistAnswer, ChecklistAnswerStatus } from '../../types';
import type { NavigatorQuestionDef } from './navigatorQuestions';

export type NavigatorLinkKind = 'document' | 'factor' | 'risk' | 'recommendation';

interface LinkOption {
  value: string;
  label: string;
}

interface Props {
  analysisId: string;
  questions: NavigatorQuestionDef[];
  linkKind?: NavigatorLinkKind;
  linkOptions?: LinkOption[];
  statusOptions?: { value: ChecklistAnswerStatus; label: string }[];
  title?: string;
}

const DEFAULT_STATUS_OPTIONS: { value: ChecklistAnswerStatus; label: string }[] = [
  { value: 'VERIFIED', label: 'Проверено' },
  { value: 'NOT_APPLICABLE', label: 'Не применимо' },
  { value: 'NEEDS_REVISION', label: 'Требует доработки' },
];

const linkFieldByKind: Record<NavigatorLinkKind, string> = {
  document: 'linkedDocumentId',
  factor: 'linkedFactorId',
  risk: 'linkedRiskId',
  recommendation: 'linkedRecommendationId',
};

function QuestionRow({
  analysisId,
  question,
  answer,
  statusOptions,
  linkKind,
  linkOptions,
  onSaved,
}: {
  analysisId: string;
  question: NavigatorQuestionDef;
  answer?: AnalysisChecklistAnswer;
  statusOptions: { value: ChecklistAnswerStatus; label: string }[];
  linkKind?: NavigatorLinkKind;
  linkOptions?: LinkOption[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [comment, setComment] = useState(answer?.comment ?? '');
  const [linkedId, setLinkedId] = useState<string | undefined>(
    linkKind ? ((answer as unknown as Record<string, string | null | undefined>)?.[linkFieldByKind[linkKind]] ?? undefined) : undefined,
  );
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (status: ChecklistAnswerStatus) => {
    await analysesApi.upsertChecklistAnswer(analysisId, question.key, { status });
    onSaved();
  };

  const handleDetailsSave = async () => {
    setSaving(true);
    try {
      await analysesApi.upsertChecklistAnswer(analysisId, question.key, {
        status: answer?.status ?? undefined,
        comment: comment || undefined,
        ...(linkKind ? { [linkFieldByKind[linkKind]]: linkedId } : {}),
      });
      setPopoverOpen(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const hasDetails = !!(answer?.comment || linkedId);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Typography.Text style={{ flex: 1 }}>{question.label}</Typography.Text>
      <Space>
        <Segmented
          size="small"
          value={answer?.status ?? undefined}
          options={statusOptions}
          onChange={(value) => handleStatusChange(value as ChecklistAnswerStatus)}
        />
        <Popover
          trigger="click"
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          title={t('analysisNavigator.detailsTitle')}
          content={
            <Space direction="vertical" style={{ width: 320 }}>
              <Input.TextArea
                rows={2}
                placeholder={t('analysisNavigator.commentPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {linkKind && (
                <Select
                  allowClear
                  style={{ width: '100%' }}
                  placeholder={t(`analysisNavigator.linkPlaceholder.${linkKind}`)}
                  options={linkOptions}
                  value={linkedId}
                  onChange={(value) => setLinkedId(value)}
                />
              )}
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button size="small" type="primary" onClick={handleDetailsSave} loading={saving}>
                  {t('common.save')}
                </Button>
              </Space>
            </Space>
          }
        >
          <Button
            size="small"
            type={hasDetails ? 'primary' : 'default'}
            ghost={hasDetails}
            icon={linkedId ? <LinkOutlined /> : <CommentOutlined />}
          />
        </Popover>
      </Space>
    </div>
  );
}

export function AnalysisNavigatorPanel({ analysisId, questions, linkKind, linkOptions, statusOptions, title }: Props) {
  const { t } = useTranslation();
  const { data, refetch } = useQuery({
    queryKey: ['analysis-checklist', analysisId],
    queryFn: () => analysesApi.getChecklist(analysisId).then((r) => r.data),
  });

  const answerByKey = new Map((data ?? []).map((a) => [a.questionKey, a]));

  return (
    <div style={{ marginTop: 16, marginBottom: 8 }}>
      <Typography.Text strong>{title ?? t('analysisNavigator.title')}</Typography.Text>
      <div style={{ marginTop: 8 }}>
        {questions.map((q) => (
          <QuestionRow
            key={q.key}
            analysisId={analysisId}
            question={q}
            answer={answerByKey.get(q.key)}
            statusOptions={statusOptions ?? DEFAULT_STATUS_OPTIONS}
            linkKind={linkKind}
            linkOptions={linkOptions}
            onSaved={() => refetch()}
          />
        ))}
      </div>
    </div>
  );
}
