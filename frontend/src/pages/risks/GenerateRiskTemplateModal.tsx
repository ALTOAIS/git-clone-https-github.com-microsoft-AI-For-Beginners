import { useState } from 'react';
import { Form, Input, Modal, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../api/endpoints';
import type { AiRiskTemplateDraft, RiskTemplate, RiskTemplateDirection } from '../../types';
import { ALL_RISK_TEMPLATE_DIRECTIONS } from '../../types';
import { riskTemplateDirectionLabel } from '../../utils/riskDisplay';

interface Props {
  open: boolean;
  onClose: () => void;
  onGenerated: (draft: Partial<RiskTemplate>) => void;
}

export function GenerateRiskTemplateModal({ open, onClose, onGenerated }: Props) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const values = await form.validateFields();
    setGenerating(true);
    try {
      const { data } = await aiApi.generateRiskTemplateForProcess({
        processDescription: values.processDescription,
        direction: values.direction,
      });
      const draft: AiRiskTemplateDraft = data;
      onGenerated({
        title: draft.title,
        description: draft.description,
        causes: draft.causes,
        corruptionScheme: draft.corruptionScheme,
        corruptionFactors: draft.corruptionFactors,
        consequences: draft.consequences,
        redFlags: draft.redFlags,
        typicalControls: draft.typicalControls,
        recommendedActions: draft.recommendedActions,
        tags: draft.tags,
        baseProbability: draft.baseProbability,
        baseImpact: draft.baseImpact,
        direction: values.direction as RiskTemplateDirection | undefined,
      });
      form.resetFields();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title={t('riskTemplateLibrary.generateFromProcessTitle')}
      open={open}
      onCancel={onClose}
      onOk={handleGenerate}
      confirmLoading={generating}
      destroyOnHidden
      okText={t('riskTemplateLibrary.generateButton')}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        {t('riskTemplateAi.mockDisclaimer')}
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Form.Item
          name="processDescription"
          label={t('riskTemplateLibrary.processDescriptionLabel')}
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="direction" label={t('riskTemplateForm.directionLabel')}>
          <Select
            allowClear
            options={ALL_RISK_TEMPLATE_DIRECTIONS.map((d) => ({ value: d, label: riskTemplateDirectionLabel(d) }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
