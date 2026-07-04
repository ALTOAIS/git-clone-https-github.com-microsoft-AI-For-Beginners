import { Button, Col, Descriptions, Form, InputNumber, message, Row, Tag } from 'antd';
import { useState } from 'react';
import { risksApi } from '../../../api/endpoints';
import type { RiskDetail } from '../../../types';
import { SCORE_LEVEL_COLORS, scoreLevel } from '../../../utils/riskDisplay';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

function ScoreTag({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <span style={{ color: '#999' }}>Not assessed</span>;
  const level = scoreLevel(score);
  return (
    <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff', fontSize: 14, padding: '2px 10px' }}>
      {score} ({level})
    </Tag>
  );
}

export function RiskAssessmentTab({ risk, onUpdated, canEdit }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await risksApi.assess(risk.id, values);
      message.success('Assessment saved');
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Inherent Risk Score">
          <ScoreTag score={risk.inherentScore} />
        </Descriptions.Item>
        <Descriptions.Item label="Residual Risk Score">
          <ScoreTag score={risk.residualScore} />
        </Descriptions.Item>
        <Descriptions.Item label="Control Effectiveness">
          {risk.controlEffectivenessAvg != null ? `${risk.controlEffectivenessAvg}%` : 'Not tested'}
        </Descriptions.Item>
        <Descriptions.Item label="Controls Count">{risk.controls?.length ?? 0}</Descriptions.Item>
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
              <Form.Item name="likelihood" label="Likelihood (1-5)">
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="impact" label="Impact (1-5)">
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="residualLikelihood" label="Residual Likelihood (1-5)">
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="residualImpact" label="Residual Impact (1-5)">
                <InputNumber min={1} max={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" onClick={handleSave} loading={saving}>
            Save Assessment
          </Button>
        </Form>
      )}
    </div>
  );
}
