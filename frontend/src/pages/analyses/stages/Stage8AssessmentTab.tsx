import { Form, InputNumber, message, Modal, Select, Space, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisDetail, AnalysisRisk } from '../../../types';
import {
  ALL_CONTROL_EFFECTIVENESS,
  CONTROL_EFFECTIVENESS_COLORS,
  controlEffectivenessLabel,
  SCORE_LEVEL_COLORS,
  scoreLevel,
  scoreLevelLabel,
} from '../../../utils/riskDisplay';

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

export function Stage8AssessmentTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [assessing, setAssessing] = useState<AnalysisRisk | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const openAssess = (risk: AnalysisRisk) => {
    setAssessing(risk);
    form.setFieldsValue(risk);
  };

  const handleSave = async () => {
    if (!assessing) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      await analysesApi.assessRisk(analysis.id, assessing.id, values);
      message.success(t('analysisStage8.saved'));
      setAssessing(null);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <span style={{ color: '#8c8c8c', display: 'block', marginBottom: 16 }}>
        {t('analysisStage8.intro')}
        <InfoTooltip text={t('tooltips.analyses.assessment')} />
      </span>

      <Table
        rowKey="id"
        dataSource={analysis.risks}
        pagination={false}
        locale={{ emptyText: t('analysisStage8.noRisksYet') }}
        columns={[
          { title: t('analysisStage8.columns.title'), dataIndex: 'title' },
          {
            title: (
              <span>
                {t('analysisStage8.columns.inherentScore')}
                <InfoTooltip text={t('tooltips.riskRegister.riskLevel')} />
              </span>
            ),
            dataIndex: 'score',
            width: 160,
            render: (v: number | null) => <ScoreTag score={v} notAssessedLabel={t('analysisStage8.notAssessed')} />,
          },
          {
            title: t('analysisStage8.columns.controlEffectiveness'),
            dataIndex: 'controlEffectiveness',
            width: 170,
            render: (v: AnalysisRisk['controlEffectiveness']) => (
              <Tag color={CONTROL_EFFECTIVENESS_COLORS[v]}>{controlEffectivenessLabel(v)}</Tag>
            ),
          },
          {
            title: (
              <span>
                {t('analysisStage8.columns.residualScore')}
                <InfoTooltip text={t('tooltips.riskRegister.residualRisk')} />
              </span>
            ),
            dataIndex: 'residualScore',
            width: 160,
            render: (v: number | null) => <ScoreTag score={v} notAssessedLabel={t('analysisStage8.notAssessed')} />,
          },
          {
            title: t('analysisStage8.columns.actions'),
            width: 120,
            render: (_: unknown, record: AnalysisRisk) => <a onClick={() => openAssess(record)}>{t('analysisStage8.assessLink')}</a>,
          },
        ]}
      />

      <Modal
        title={t('analysisStage8.modalTitle')}
        open={!!assessing}
        onCancel={() => setAssessing(null)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Space size="large" style={{ width: '100%' }} wrap>
            <Form.Item
              name="likelihood"
              label={
                <span>
                  {t('analysisStage8.likelihoodLabel')}
                  <InfoTooltip text={t('tooltips.riskRegister.likelihood')} />
                </span>
              }
            >
              <InputNumber min={1} max={5} />
            </Form.Item>
            <Form.Item
              name="impact"
              label={
                <span>
                  {t('analysisStage8.impactLabel')}
                  <InfoTooltip text={t('tooltips.riskRegister.impact')} />
                </span>
              }
            >
              <InputNumber min={1} max={5} />
            </Form.Item>
          </Space>
          <Form.Item
            name="controlEffectiveness"
            label={
              <span>
                {t('analysisStage8.controlEffectivenessLabel')}
                <InfoTooltip text={t('tooltips.riskRegister.controls')} />
              </span>
            }
          >
            <Select options={ALL_CONTROL_EFFECTIVENESS.map((value) => ({ value, label: controlEffectivenessLabel(value) }))} />
          </Form.Item>
          <Space size="large" style={{ width: '100%' }} wrap>
            <Form.Item name="residualLikelihood" label={t('analysisStage8.residualLikelihoodLabel')}>
              <InputNumber min={1} max={5} />
            </Form.Item>
            <Form.Item name="residualImpact" label={t('analysisStage8.residualImpactLabel')}>
              <InputNumber min={1} max={5} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
