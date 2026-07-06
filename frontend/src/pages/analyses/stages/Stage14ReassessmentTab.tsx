import { Button, Form, Input, message, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisDetail } from '../../../types';
import { SCORE_LEVEL_COLORS, scoreLevel, scoreLevelLabel } from '../../../utils/riskDisplay';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

function ScoreTag({ score, notAssessedLabel }: { score?: number | null; notAssessedLabel: string }) {
  if (score === null || score === undefined) return <span style={{ color: '#999' }}>{notAssessedLabel}</span>;
  const level = scoreLevel(score);
  return (
    <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff' }}>
      {score} ({level ? scoreLevelLabel(level) : ''})
    </Tag>
  );
}

export function Stage14ReassessmentTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({ reassessmentNotes: analysis.reassessmentNotes });
  }, [analysis, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await analysesApi.updateReassessment(analysis.id, values.reassessmentNotes);
      message.success(t('analysisStage14.saved'));
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <span style={{ color: '#8c8c8c', display: 'block', marginBottom: 16 }}>
        {t('analysisStage14.intro')}
        <InfoTooltip text={t('tooltips.analyses.reassessment')} />
      </span>

      <Table
        rowKey="id"
        dataSource={analysis.risks}
        pagination={false}
        style={{ marginBottom: 24 }}
        locale={{ emptyText: t('analysisStage14.noRisksYet') }}
        columns={[
          { title: t('analysisStage14.columns.title'), dataIndex: 'title' },
          {
            title: t('analysisStage14.columns.inherentScore'),
            dataIndex: 'score',
            width: 160,
            render: (v: number | null) => <ScoreTag score={v} notAssessedLabel={t('analysisStage14.notAssessed')} />,
          },
          {
            title: t('analysisStage14.columns.residualScore'),
            dataIndex: 'residualScore',
            width: 160,
            render: (v: number | null) => <ScoreTag score={v} notAssessedLabel={t('analysisStage14.notAssessed')} />,
          },
        ]}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="reassessmentNotes"
          label={
            <span>
              {t('analysisStage14.notesLabel')}
              <InfoTooltip text={t('tooltips.analyses.reassessment')} />
            </span>
          }
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Button type="primary" onClick={handleSave} loading={saving}>
          {t('analysisStage14.saveButton')}
        </Button>
        {analysis.reassessedAt && (
          <Typography.Text type="secondary" style={{ marginLeft: 16 }}>
            {t('analysisStage14.lastReassessedAt', { date: dayjs(analysis.reassessedAt).format('YYYY-MM-DD HH:mm') })}
          </Typography.Text>
        )}
      </Form>
    </div>
  );
}
