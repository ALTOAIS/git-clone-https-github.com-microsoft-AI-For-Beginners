import { useState } from 'react';
import { App, Button, Card, List, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { aiApi, riskTemplatesApi } from '../../api/endpoints';
import type { AiControlSuggestion, RiskTemplate } from '../../types';

interface Props {
  template: RiskTemplate;
  onApplied: (patch: Partial<RiskTemplate>) => void;
}

export function RiskTemplateAiPanel({ template, onApplied }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [loading, setLoading] = useState<string | null>(null);
  const [similar, setSimilar] = useState<RiskTemplate[] | null>(null);
  const [improved, setImproved] = useState<string | null>(null);
  const [controls, setControls] = useState<AiControlSuggestion[] | null>(null);
  const [actions, setActions] = useState<string[] | null>(null);

  const handleSimilar = async () => {
    setLoading('similar');
    try {
      const { data } = await riskTemplatesApi.similar(template.id);
      setSimilar(data);
    } finally {
      setLoading(null);
    }
  };

  const handleImprove = async () => {
    setLoading('improve');
    try {
      const { data } = await aiApi.improveRiskTemplateDescription(template.id);
      setImproved(data.improvedDescription);
    } finally {
      setLoading(null);
    }
  };

  const handleSuggestControls = async () => {
    setLoading('controls');
    try {
      const { data } = await aiApi.suggestRiskTemplateControls(template.id);
      setControls(data.controls);
    } finally {
      setLoading(null);
    }
  };

  const handleSuggestActions = async () => {
    setLoading('actions');
    try {
      const { data } = await aiApi.suggestRiskTemplateActions(template.id);
      setActions(data.actions);
    } finally {
      setLoading(null);
    }
  };

  const applyImprovedDescription = async () => {
    if (!improved) return;
    await riskTemplatesApi.update(template.id, { description: improved });
    onApplied({ description: improved });
    setImproved(null);
    message.success(t('riskTemplateAi.applied'));
  };

  const applyControl = async (description: string) => {
    const next = [...template.typicalControls, description];
    await riskTemplatesApi.update(template.id, { typicalControls: next });
    onApplied({ typicalControls: next });
    message.success(t('riskTemplateAi.applied'));
  };

  const applyAction = async (action: string) => {
    const next = [...template.recommendedActions, action];
    await riskTemplatesApi.update(template.id, { recommendedActions: next });
    onApplied({ recommendedActions: next });
    message.success(t('riskTemplateAi.applied'));
  };

  return (
    <Card size="small" title={t('riskTemplateAi.title')} style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        {t('riskTemplateAi.mockDisclaimer')}
      </Typography.Paragraph>
      <Space wrap style={{ marginBottom: 12 }}>
        <Button size="small" loading={loading === 'similar'} onClick={handleSimilar}>
          {t('riskTemplateAi.similarButton')}
        </Button>
        <Button size="small" loading={loading === 'improve'} onClick={handleImprove}>
          {t('riskTemplateAi.improveButton')}
        </Button>
        <Button size="small" loading={loading === 'controls'} onClick={handleSuggestControls}>
          {t('riskTemplateAi.controlsButton')}
        </Button>
        <Button size="small" loading={loading === 'actions'} onClick={handleSuggestActions}>
          {t('riskTemplateAi.actionsButton')}
        </Button>
      </Space>

      {similar && (
        <Card size="small" type="inner" title={t('riskTemplateAi.similarTitle')} style={{ marginBottom: 12 }}>
          {similar.length === 0 ? (
            <Typography.Text type="secondary">{t('riskTemplateAi.similarEmpty')}</Typography.Text>
          ) : (
            <List
              size="small"
              dataSource={similar}
              renderItem={(item) => (
                <List.Item>
                  <Typography.Text>{item.title}</Typography.Text>
                  <Tag>{item.code}</Tag>
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      {improved && (
        <Card
          size="small"
          type="inner"
          title={t('riskTemplateAi.improveTitle')}
          style={{ marginBottom: 12 }}
          extra={
            <Button size="small" type="primary" onClick={applyImprovedDescription}>
              {t('riskTemplateAi.applyButton')}
            </Button>
          }
        >
          <Typography.Paragraph style={{ marginBottom: 0 }}>{improved}</Typography.Paragraph>
        </Card>
      )}

      {controls && (
        <Card size="small" type="inner" title={t('riskTemplateAi.controlsTitle')} style={{ marginBottom: 12 }}>
          <List
            size="small"
            dataSource={controls}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <a key="apply" onClick={() => applyControl(item.description)}>
                    {t('riskTemplateAi.applyButton')}
                  </a>,
                ]}
              >
                <List.Item.Meta title={<Tag>{item.controlType}</Tag>} description={item.description} />
              </List.Item>
            )}
          />
        </Card>
      )}

      {actions && (
        <Card size="small" type="inner" title={t('riskTemplateAi.actionsTitle')}>
          <List
            size="small"
            dataSource={actions}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <a key="apply" onClick={() => applyAction(item)}>
                    {t('riskTemplateAi.applyButton')}
                  </a>,
                ]}
              >
                {item}
              </List.Item>
            )}
          />
        </Card>
      )}
    </Card>
  );
}
