import { Button, Col, Descriptions, Form, InputNumber, message, Row, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { risksApi } from '../../../api/endpoints';
import type { RiskDetail } from '../../../types';
import { SCORE_LEVEL_COLORS, scoreLevel, scoreLevelLabel } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

function ScoreTag({ score, notAssessedLabel }: { score?: number | null; notAssessedLabel: string }) {
  if (score === null || score === undefined) return <span style={{ color: '#999' }}>{notAssessedLabel}</span>;
  const level = scoreLevel(score);
  return (
    <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff', fontSize: 14, padding: '2px 10px' }}>
      {score} ({level ? scoreLevelLabel(level) : ''})
    </Tag>
  );
}

export function RiskAssessmentTab({ risk, onUpdated, canEdit }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await risksApi.assess(risk.id, values);
      message.success(t('riskAssessment.saved'));
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t('riskAssessment.inherentScoreLabel')}>
          <ScoreTag score={risk.inherentScore} notAssessedLabel={t('riskAssessment.notAssessed')} />
        </Descriptions.Item>
        <Descriptions.Item label={t('riskAssessment.residualScoreLabel')}>
          <ScoreTag score={risk.residualScore} notAssessedLabel={t('riskAssessment.notAssessed')} />
        </Descriptions.Item>
        <Descriptions.Item label={t('riskAssessment.controlEffectivenessLabel')}>
          {risk.controlEffectivenessAvg != null ? `${risk.controlEffectivenessAvg}%` : t('riskAssessment.notTested')}
        </Descriptions.Item>
        <Descriptions.Item label={t('riskAssessment.controlsCountLabel')}>{risk.controls?.length ?? 0}</Descriptions.Item>
      </Descriptions>

      {canEdit && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            likelihood: risk.likelihood,
            impact: risk.impact,
            residualLikelihood: risk.residualLikelihood,
            residualImpact: risk.residualImpact,
          }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="likelihood" label={t('riskAssessment.likelihoodLabel')}>
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="impact" label={t('riskAssessment.impactLabel')}>
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="residualLikelihood" label={t('riskAssessment.residualLikelihoodLabel')}>
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="residualImpact" label={t('riskAssessment.residualImpactLabel')}>
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" onClick={handleSave} loading={saving}>
            {t('riskAssessment.saveButton')}
          </Button>
        </Form>
      )}
    </div>
  );
}
