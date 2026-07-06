import { CopyOutlined, DownloadOutlined, FilePdfOutlined, RobotOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Progress,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, analysesApi, risksApi } from '../../api/endpoints';
import { downloadViaApi } from '../../utils/download';
import type {
  AiControlSuggestion,
  AiReportResult,
  AiReviewResult,
  AiRiskRegisterEntryResult,
  AiRiskSuggestion,
  AnalysisDetail,
} from '../../types';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

type DrawerContent =
  | { kind: 'risks'; data: AiRiskSuggestion[] }
  | { kind: 'controls'; riskId: string; data: AiControlSuggestion[] }
  | { kind: 'review'; data: AiReviewResult }
  | { kind: 'report'; data: AiReportResult }
  | { kind: 'registerEntry'; data: AiRiskRegisterEntryResult };

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function VakrAiPanel({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [processStepId, setProcessStepId] = useState<string | undefined>();
  const [controlsRiskId, setControlsRiskId] = useState<string | undefined>();
  const [registerRiskId, setRegisterRiskId] = useState<string | undefined>();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerContent | null>(null);
  const [addedRiskIndexes, setAddedRiskIndexes] = useState<number[]>([]);
  const [registerForm, setRegisterForm] = useState<{
    title: string;
    description: string;
    likelihood?: number;
    impact?: number;
  } | null>(null);

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setLoadingAction(key);
    try {
      await fn();
    } catch {
      message.error(t('vakrAi.errorGeneric'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSuggestRisks = () =>
    runAction('risks', async () => {
      if (!processStepId) return;
      const { data } = await aiApi.analyzeRisk(analysis.id, processStepId);
      setAddedRiskIndexes([]);
      setDrawer({ kind: 'risks', data: data.risks });
    });

  const handleSuggestControls = () =>
    runAction('controls', async () => {
      if (!controlsRiskId) return;
      const { data } = await aiApi.suggestControls(analysis.id, controlsRiskId);
      setDrawer({ kind: 'controls', riskId: controlsRiskId, data: data.controls });
    });

  const handleReview = () =>
    runAction('review', async () => {
      const { data } = await aiApi.reviewVakrAnalysis(analysis.id);
      setDrawer({ kind: 'review', data });
    });

  const handleReport = () =>
    runAction('report', async () => {
      const { data } = await aiApi.generateVakrReport(analysis.id);
      setDrawer({ kind: 'report', data });
    });

  const handleGenerateRegisterEntry = () =>
    runAction('registerEntry', async () => {
      if (!registerRiskId) return;
      const { data } = await aiApi.generateRiskRegisterEntry(analysis.id, registerRiskId);
      setRegisterForm({ title: data.title, description: data.description, likelihood: data.likelihood, impact: data.impact });
      setDrawer({ kind: 'registerEntry', data });
    });

  const handleAddRiskSuggestion = async (suggestion: AiRiskSuggestion, index: number) => {
    await analysesApi.addRisk(analysis.id, {
      title: suggestion.riskTitle,
      description: suggestion.riskDescription,
      corruptionScheme: suggestion.possibleSchemes[0],
      cause: suggestion.rootCauses.join('; '),
      existingControls: suggestion.recommendedControls.join('; '),
    });
    setAddedRiskIndexes((prev) => [...prev, index]);
    message.success(t('vakrAi.riskAdded'));
    onUpdated();
  };

  const handleAddControlSuggestion = async (suggestion: AiControlSuggestion, riskId: string) => {
    const risk = analysis.risks.find((r) => r.id === riskId);
    const existing = risk?.existingControls ?? '';
    await analysesApi.updateRisk(analysis.id, riskId, {
      existingControls: existing ? `${existing}\n${suggestion.description}` : suggestion.description,
    });
    message.success(t('vakrAi.controlAdded'));
    onUpdated();
  };

  const handleCreateRiskRegisterEntry = async () => {
    if (!registerForm) return;
    await risksApi.create({
      title: registerForm.title,
      description: registerForm.description,
      likelihood: registerForm.likelihood,
      impact: registerForm.impact,
    });
    message.success(t('vakrAi.riskRegisterEntryCreated'));
    setDrawer(null);
  };

  const reportAsText = (report: AiReportResult) =>
    `${report.title}\n\n${report.sections.map((s) => `${s.heading}\n${s.content}`).join('\n\n')}\n\n${report.disclaimer}`;

  return (
    <>
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined />
            {t('vakrAi.panelTitle')}
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Space wrap>
            <Select
              placeholder={t('vakrAi.selectProcessStep')}
              style={{ width: 260 }}
              value={processStepId}
              onChange={setProcessStepId}
              options={analysis.processSteps.map((s) => ({ value: s.id, label: s.name }))}
            />
            <Button loading={loadingAction === 'risks'} disabled={!processStepId} onClick={handleSuggestRisks}>
              {t('vakrAi.suggestRisksButton')}
            </Button>
          </Space>

          <Space wrap>
            <Select
              placeholder={t('vakrAi.selectRisk')}
              style={{ width: 260 }}
              value={controlsRiskId}
              onChange={setControlsRiskId}
              options={analysis.risks.map((r) => ({ value: r.id, label: r.title }))}
            />
            <Button loading={loadingAction === 'controls'} disabled={!controlsRiskId} onClick={handleSuggestControls}>
              {t('vakrAi.suggestControlsButton')}
            </Button>
          </Space>

          <Space wrap>
            <Select
              placeholder={t('vakrAi.selectRisk')}
              style={{ width: 260 }}
              value={registerRiskId}
              onChange={setRegisterRiskId}
              options={analysis.risks.map((r) => ({ value: r.id, label: r.title }))}
            />
            <Button
              loading={loadingAction === 'registerEntry'}
              disabled={!registerRiskId}
              onClick={handleGenerateRegisterEntry}
            >
              {t('vakrAi.generateRegisterEntryButton')}
            </Button>
          </Space>

          <Space wrap>
            <Button loading={loadingAction === 'review'} onClick={handleReview}>
              {t('vakrAi.reviewButton')}
            </Button>
            <Button loading={loadingAction === 'report'} onClick={handleReport}>
              {t('vakrAi.reportButton')}
            </Button>
          </Space>
        </Space>
      </Card>

      <Drawer
        title={t('vakrAi.drawerTitle')}
        open={!!drawer}
        onClose={() => setDrawer(null)}
        width={560}
        destroyOnHidden
      >
        {!drawer && <Skeleton active />}

        {drawer?.kind === 'risks' &&
          (drawer.data.length === 0 ? (
            <Empty description={t('vakrAi.noSuggestions')} />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {drawer.data.map((risk, index) => (
                <Card key={index} size="small" title={risk.riskTitle}>
                  <Typography.Paragraph>{risk.riskDescription}</Typography.Paragraph>
                  <Typography.Text strong>{t('vakrAi.possibleSchemes')}</Typography.Text>
                  <ul>
                    {risk.possibleSchemes.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  <Typography.Text strong>{t('vakrAi.rootCauses')}</Typography.Text>
                  <ul>
                    {risk.rootCauses.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  <Typography.Text strong>{t('vakrAi.recommendedControls')}</Typography.Text>
                  <ul>
                    {risk.recommendedControls.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  <Tag color={risk.confidence === 'high' ? 'green' : risk.confidence === 'medium' ? 'blue' : 'default'}>
                    {t(`vakrAi.confidence.${risk.confidence}`)}
                  </Tag>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      size="small"
                      disabled={addedRiskIndexes.includes(index)}
                      onClick={() => handleAddRiskSuggestion(risk, index)}
                    >
                      {addedRiskIndexes.includes(index) ? t('vakrAi.added') : t('vakrAi.addToAnalysis')}
                    </Button>
                  </div>
                </Card>
              ))}
            </Space>
          ))}

        {drawer?.kind === 'controls' &&
          (drawer.data.length === 0 ? (
            <Empty description={t('vakrAi.noSuggestions')} />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {drawer.data.map((control, index) => (
                <Card key={index} size="small" title={t(`vakrAi.controlType.${control.controlType}`)}>
                  <Typography.Paragraph>{control.description}</Typography.Paragraph>
                  <Typography.Text type="secondary">{control.implementationNotes}</Typography.Text>
                  <div style={{ marginTop: 8 }}>
                    <Button type="primary" size="small" onClick={() => handleAddControlSuggestion(control, drawer.riskId)}>
                      {t('vakrAi.addToRiskControls')}
                    </Button>
                  </div>
                </Card>
              ))}
            </Space>
          ))}

        {drawer?.kind === 'review' && (
          <>
            <Typography.Title level={5}>{t('aiAssistant.completenessLabel')}</Typography.Title>
            <Progress percent={drawer.data.completenessScore} />
            <Space wrap style={{ margin: '12px 0' }}>
              {drawer.data.coveredStages.map((stage) => (
                <Tag color="green" key={stage}>
                  {stage}
                </Tag>
              ))}
            </Space>
            {drawer.data.missingConsiderations.length > 0 && (
              <>
                <Typography.Title level={5}>{t('aiAssistant.missingConsiderations')}</Typography.Title>
                <ul>
                  {drawer.data.missingConsiderations.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            {drawer.data.qualityIssues.length > 0 && (
              <>
                <Typography.Title level={5}>{t('aiAssistant.qualityIssues')}</Typography.Title>
                <ul>
                  {drawer.data.qualityIssues.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </>
            )}
            <Typography.Paragraph>{drawer.data.summary}</Typography.Paragraph>
            <Typography.Text type="secondary">{drawer.data.disclaimer}</Typography.Text>
          </>
        )}

        {drawer?.kind === 'report' && (
          <>
            <Space style={{ marginBottom: 16 }}>
              <Button icon={<CopyOutlined />} onClick={() => navigator.clipboard.writeText(reportAsText(drawer.data))}>
                {t('aiAssistant.copyButton')}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => downloadText(`vakr-report-${Date.now()}.txt`, reportAsText(drawer.data))}
              >
                {t('aiAssistant.exportButton')}
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => downloadViaApi(aiApi.vakrReportPdfPath(analysis.id), `vakr-report-${Date.now()}.pdf`)}
              >
                {t('aiAssistant.pdfButton')}
              </Button>
            </Space>
            {drawer.data.sections.map((section) => (
              <div key={section.heading} style={{ marginBottom: 16 }}>
                <Typography.Title level={5}>{section.heading}</Typography.Title>
                <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{section.content}</Typography.Paragraph>
              </div>
            ))}
            <Typography.Text type="secondary">{drawer.data.disclaimer}</Typography.Text>
          </>
        )}

        {drawer?.kind === 'registerEntry' && registerForm && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text strong>{t('vakrAi.registerTitleLabel')}</Typography.Text>
            <Input value={registerForm.title} onChange={(e) => setRegisterForm({ ...registerForm, title: e.target.value })} />
            <Typography.Text strong>{t('vakrAi.registerDescriptionLabel')}</Typography.Text>
            <Input.TextArea
              rows={3}
              value={registerForm.description}
              onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
            />
            <Space>
              <div>
                <Typography.Text strong>{t('vakrAi.registerLikelihoodLabel')}</Typography.Text>
                <InputNumber
                  min={1}
                  max={5}
                  value={registerForm.likelihood}
                  onChange={(v) => setRegisterForm({ ...registerForm, likelihood: v ?? undefined })}
                />
              </div>
              <div>
                <Typography.Text strong>{t('vakrAi.registerImpactLabel')}</Typography.Text>
                <InputNumber
                  min={1}
                  max={5}
                  value={registerForm.impact}
                  onChange={(v) => setRegisterForm({ ...registerForm, impact: v ?? undefined })}
                />
              </div>
            </Space>
            <Typography.Text type="secondary">
              {t('vakrAi.registerCategoryHint')}: {drawer.data.categoryHint}
            </Typography.Text>
            <Typography.Paragraph type="secondary">{drawer.data.justification}</Typography.Paragraph>
            <Button type="primary" onClick={handleCreateRiskRegisterEntry}>
              {t('vakrAi.createRiskRegisterEntryButton')}
            </Button>
            <Typography.Text type="secondary">{drawer.data.disclaimer}</Typography.Text>
          </Space>
        )}
      </Drawer>
    </>
  );
}
