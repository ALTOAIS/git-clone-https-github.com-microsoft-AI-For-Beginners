import { useQuery } from '@tanstack/react-query';
import { Checkbox, DatePicker, Input, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../api/endpoints';
import { useDepartments } from '../../hooks/useReferenceData';
import type { AnalysisDetail, AnalysisChecklistAnswer } from '../../types';
import { SOURCE_CHECKLIST_CATALOG } from './navigatorQuestions';

interface Props {
  analysis: AnalysisDetail;
}

const STATUS_OPTIONS = [
  { value: 'REQUESTED', label: 'Запрошено' },
  { value: 'RECEIVED', label: 'Получено' },
  { value: 'NOT_APPLICABLE', label: 'Не применимо' },
];

export function SourceInformationChecklistPanel({ analysis }: Props) {
  const { t } = useTranslation();
  const { data: departments } = useDepartments(analysis.companyId ?? undefined);
  const { data, refetch } = useQuery({
    queryKey: ['analysis-checklist', analysis.id],
    queryFn: () => analysesApi.getChecklist(analysis.id).then((r) => r.data),
  });

  const answerByKey = new Map((data ?? []).map((a) => [a.questionKey, a]));

  const patch = async (key: string, field: keyof AnalysisChecklistAnswer, value: unknown) => {
    await analysesApi.upsertChecklistAnswer(analysis.id, key, { [field]: value });
    refetch();
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <Typography.Text strong>{t('analysisStage4.sourceChecklistTitle')}</Typography.Text>
      <Table
        style={{ marginTop: 8 }}
        size="small"
        rowKey="key"
        dataSource={SOURCE_CHECKLIST_CATALOG}
        pagination={false}
        columns={[
          { title: t('analysisStage4.sourceChecklistColumns.source'), dataIndex: 'label', width: 260 },
          {
            title: t('analysisStage4.sourceChecklistColumns.status'),
            width: 160,
            render: (_: unknown, row) => {
              const answer = answerByKey.get(row.key);
              return (
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  allowClear
                  value={answer?.status ?? undefined}
                  options={STATUS_OPTIONS}
                  onChange={(value) => patch(row.key, 'status', value)}
                />
              );
            },
          },
          {
            title: t('analysisStage4.sourceChecklistColumns.responsibleDepartment'),
            width: 200,
            render: (_: unknown, row) => {
              const answer = answerByKey.get(row.key);
              return (
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={answer?.responsibleDepartmentId ?? undefined}
                  options={departments?.map((d) => ({ value: d.id, label: d.name }))}
                  onChange={(value) => patch(row.key, 'responsibleDepartmentId', value)}
                />
              );
            },
          },
          {
            title: t('analysisStage4.sourceChecklistColumns.dueDate'),
            width: 150,
            render: (_: unknown, row) => {
              const answer = answerByKey.get(row.key);
              return (
                <DatePicker
                  size="small"
                  style={{ width: '100%' }}
                  value={answer?.dueDate ? dayjs(answer.dueDate) : undefined}
                  onChange={(value) => patch(row.key, 'dueDate', value?.toISOString())}
                />
              );
            },
          },
          {
            title: t('analysisStage4.sourceChecklistColumns.document'),
            width: 200,
            render: (_: unknown, row) => {
              const answer = answerByKey.get(row.key);
              return (
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  value={answer?.linkedDocumentId ?? undefined}
                  options={analysis.documents.map((d) => ({ value: d.id, label: d.fileName }))}
                  onChange={(value) => patch(row.key, 'linkedDocumentId', value)}
                />
              );
            },
          },
          {
            title: t('analysisStage4.sourceChecklistColumns.currentReliable'),
            width: 170,
            render: (_: unknown, row) => {
              const answer = answerByKey.get(row.key);
              return (
                <Space direction="vertical" size={0}>
                  <Checkbox
                    checked={!!answer?.isCurrent}
                    onChange={(e) => patch(row.key, 'isCurrent', e.target.checked)}
                  >
                    {t('analysisStage4.sourceChecklistColumns.isCurrent')}
                  </Checkbox>
                  <Checkbox
                    checked={!!answer?.isReliable}
                    onChange={(e) => patch(row.key, 'isReliable', e.target.checked)}
                  >
                    {t('analysisStage4.sourceChecklistColumns.isReliable')}
                  </Checkbox>
                </Space>
              );
            },
          },
          {
            title: t('analysisStage4.sourceChecklistColumns.comment'),
            width: 220,
            render: (_: unknown, row) => {
              const answer = answerByKey.get(row.key);
              return (
                <Input.TextArea
                  autoSize
                  defaultValue={answer?.comment ?? ''}
                  onBlur={(e) => patch(row.key, 'comment', e.target.value || undefined)}
                />
              );
            },
          },
        ]}
      />
    </div>
  );
}
