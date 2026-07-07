import { CopyOutlined, DownloadOutlined, FilePdfOutlined, FileWordOutlined, SendOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Progress,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, analysesApi } from '../../api/endpoints';
import { downloadViaApi } from '../../utils/download';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { AiReportResult, AiReviewResult } from '../../types';

type UseCase = 'chat' | 'review' | 'report' | 'dashboard';

const CONTROL_EFFECTIVENESS_COLORS: Record<string, string> = {
  EFFECTIVE: 'green',
  PARTIALLY_EFFECTIVE: 'blue',
  INEFFECTIVE: 'red',
  NOT_TESTED: 'default',
};

const CONTROL_EFFECTIVENESS_LABEL_KEYS: Record<string, string> = {
  EFFECTIVE: 'aiAssistant.dashboard.controlEffectiveness.effective',
  PARTIALLY_EFFECTIVE: 'aiAssistant.dashboard.controlEffectiveness.partiallyEffective',
  INEFFECTIVE: 'aiAssistant.dashboard.controlEffectiveness.ineffective',
  NOT_TESTED: 'aiAssistant.dashboard.controlEffectiveness.notTested',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

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

export function AiAssistantPage() {
  const { t } = useTranslation();
  const [useCase, setUseCase] = useState<UseCase>('chat');
  const [analysisId, setAnalysisId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reviewResult, setReviewResult] = useState<AiReviewResult | null>(null);
  const [reportResult, setReportResult] = useState<AiReportResult | null>(null);

  const { data: analyses } = useQuery({
    queryKey: ['analyses-for-ai'],
    queryFn: () => analysesApi.list({ pageSize: 200 }).then((r) => r.data),
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['ai-risk-intelligence-dashboard'],
    queryFn: () => aiApi.riskIntelligenceDashboard().then((r) => r.data),
    enabled: useCase === 'dashboard',
  });

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', text: message }]);
    setChatInput('');
    setLoading(true);
    setError(null);
    try {
      const { data } = await aiApi.chat({
        message,
        module: 'GENERAL',
        contextEntityType: analysisId ? 'ANALYSIS' : undefined,
        contextEntityId: analysisId,
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
    } catch {
      setError(t('aiAssistant.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!analysisId) return;
    setLoading(true);
    setError(null);
    setReviewResult(null);
    try {
      const { data } = await aiApi.reviewVakrAnalysis(analysisId);
      setReviewResult(data);
    } catch {
      setError(t('aiAssistant.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!analysisId) return;
    setLoading(true);
    setError(null);
    setReportResult(null);
    try {
      const { data } = await aiApi.generateVakrReport(analysisId);
      setReportResult(data);
    } catch {
      setError(t('aiAssistant.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const reportAsText = (report: AiReportResult) =>
    `${report.title}\n\n${report.sections.map((s) => `${s.heading}\n${s.content}`).join('\n\n')}\n\n${report.disclaimer}`;

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('aiAssistant.title')}
          <InfoTooltip text={t('tooltips.ai.overview')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="ai" />
      </Space>
      <Typography.Paragraph type="secondary">{t('aiAssistant.description')}</Typography.Paragraph>
      <Alert type="warning" showIcon message={t('aiAssistant.disclaimer')} style={{ marginBottom: 16 }} />

      <Segmented
        style={{ marginBottom: 16 }}
        value={useCase}
        onChange={(v) => setUseCase(v as UseCase)}
        options={[
          { label: t('aiAssistant.useCases.chat'), value: 'chat' },
          { label: t('aiAssistant.useCases.review'), value: 'review' },
          { label: t('aiAssistant.useCases.report'), value: 'report' },
          { label: t('aiAssistant.useCases.dashboard'), value: 'dashboard' },
        ]}
      />

      {useCase !== 'dashboard' && (
        <Space style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder={t('aiAssistant.contextPlaceholder')}
            style={{ width: 340 }}
            value={analysisId}
            onChange={setAnalysisId}
            options={analyses?.items.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
          />
          {useCase === 'review' && (
            <Button type="primary" disabled={!analysisId} loading={loading} onClick={handleReview}>
              {t('aiAssistant.reviewButton')}
            </Button>
          )}
          {useCase === 'report' && (
            <Button type="primary" disabled={!analysisId} loading={loading} onClick={handleReport}>
              {t('aiAssistant.reportButton')}
            </Button>
          )}
        </Space>
      )}

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      {useCase === 'chat' && (
        <Card>
          {chatMessages.length === 0 ? (
            <Empty description={t('aiAssistant.chatEmpty')} />
          ) : (
            <List
              dataSource={chatMessages}
              renderItem={(msg, index) => (
                <List.Item key={index} style={{ border: 'none', padding: '8px 0' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Tag color={msg.role === 'user' ? 'blue' : 'green'}>
                      {msg.role === 'user' ? t('aiAssistant.you') : t('aiAssistant.assistant')}
                    </Tag>
                    <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{msg.text}</Typography.Paragraph>
                  </Space>
                </List.Item>
              )}
            />
          )}
          <Space.Compact style={{ width: '100%', marginTop: 16 }}>
            <Input
              placeholder={t('aiAssistant.chatPlaceholder')}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onPressEnter={handleSendChat}
            />
            <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSendChat}>
              {t('aiAssistant.sendButton')}
            </Button>
          </Space.Compact>
        </Card>
      )}

      {useCase === 'review' && (
        <>
          {loading && <Skeleton active paragraph={{ rows: 6 }} />}
          {!loading && !reviewResult && <Empty description={t('aiAssistant.selectAnalysisHint')} />}
          {!loading && reviewResult && (
            <Card>
              <Typography.Title level={5}>{t('aiAssistant.completenessLabel')}</Typography.Title>
              <Progress percent={reviewResult.completenessScore} />
              <Space wrap style={{ margin: '12px 0' }}>
                {reviewResult.coveredStages.map((stage) => (
                  <Tag color="green" key={stage}>
                    {stage}
                  </Tag>
                ))}
              </Space>
              {reviewResult.missingConsiderations.length > 0 && (
                <>
                  <Typography.Title level={5}>{t('aiAssistant.missingConsiderations')}</Typography.Title>
                  <ul>
                    {reviewResult.missingConsiderations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              {reviewResult.qualityIssues.length > 0 && (
                <>
                  <Typography.Title level={5}>{t('aiAssistant.qualityIssues')}</Typography.Title>
                  <ul>
                    {reviewResult.qualityIssues.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <Typography.Paragraph>{reviewResult.summary}</Typography.Paragraph>
              <Typography.Text type="secondary">{reviewResult.disclaimer}</Typography.Text>
            </Card>
          )}
        </>
      )}

      {useCase === 'report' && (
        <>
          {loading && <Skeleton active paragraph={{ rows: 8 }} />}
          {!loading && !reportResult && <Empty description={t('aiAssistant.selectAnalysisHint')} />}
          {!loading && reportResult && (
            <Card
              title={reportResult.title}
              extra={
                <Space>
                  <Button icon={<CopyOutlined />} onClick={() => navigator.clipboard.writeText(reportAsText(reportResult))}>
                    {t('aiAssistant.copyButton')}
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadText(`vakr-report-${Date.now()}.txt`, reportAsText(reportResult))}
                  >
                    {t('aiAssistant.exportButton')}
                  </Button>
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={() => analysisId && downloadViaApi(aiApi.vakrReportPdfPath(analysisId), `vakr-report-${Date.now()}.pdf`)}
                  >
                    {t('aiAssistant.pdfButton')}
                  </Button>
                  <Button
                    icon={<FileWordOutlined />}
                    onClick={() => analysisId && downloadViaApi(aiApi.vakrReportDocxPath(analysisId), `vakr-report-${Date.now()}.docx`)}
                  >
                    {t('aiAssistant.wordButton')}
                  </Button>
                </Space>
              }
            >
              {reportResult.sections.map((section) => (
                <div key={section.heading} style={{ marginBottom: 16 }}>
                  <Typography.Title level={5}>{section.heading}</Typography.Title>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{section.content}</Typography.Paragraph>
                </div>
              ))}
              <Typography.Text type="secondary">{reportResult.disclaimer}</Typography.Text>
            </Card>
          )}
        </>
      )}

      {useCase === 'dashboard' && (
        <>
          {dashboardLoading && <Skeleton active paragraph={{ rows: 8 }} />}
          {!dashboardLoading && dashboard && (
            <>
              <Row gutter={16}>
                <Col span={6}>
                  <Card>
                    <Typography.Text strong>{t('aiAssistant.dashboard.vakrTitle')}</Typography.Text>
                    <Row gutter={8} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.total')} value={dashboard.vakr.total} />
                      </Col>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.completed')} value={dashboard.vakr.completed} />
                      </Col>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.inProgress')} value={dashboard.vakr.inProgress} />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={t('aiAssistant.dashboard.overdue')}
                          value={dashboard.vakr.overdue}
                          valueStyle={dashboard.vakr.overdue > 0 ? { color: '#cf1322' } : undefined}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Typography.Text strong>{t('aiAssistant.dashboard.riskRegisterTitle')}</Typography.Text>
                    <Row gutter={8} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.active')} value={dashboard.riskRegister.active} />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={t('aiAssistant.dashboard.critical')}
                          value={dashboard.riskRegister.critical}
                          valueStyle={dashboard.riskRegister.critical > 0 ? { color: '#cf1322' } : undefined}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Typography.Text strong>{t('aiAssistant.dashboard.incidentsTitle')}</Typography.Text>
                    <Row gutter={8} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.total')} value={dashboard.incidents.total} />
                      </Col>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.open')} value={dashboard.incidents.open} />
                      </Col>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.underReview')} value={dashboard.incidents.underReview} />
                      </Col>
                      <Col span={12}>
                        <Statistic title={t('aiAssistant.dashboard.resolved')} value={dashboard.incidents.resolved} />
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Typography.Text strong>{t('aiAssistant.dashboard.academyTitle')}</Typography.Text>
                    <Row gutter={[8, 12]} style={{ marginTop: 8 }}>
                      <Col span={24}>
                        <Statistic
                          title={t('aiAssistant.dashboard.completionPercent')}
                          value={dashboard.academy.completionPercent}
                          suffix="%"
                        />
                      </Col>
                      <Col span={24}>
                        <Statistic
                          title={t('aiAssistant.dashboard.overdueAssignments')}
                          value={dashboard.academy.overdueAssignments}
                          valueStyle={dashboard.academy.overdueAssignments > 0 ? { color: '#cf1322' } : undefined}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>

              <Card title={t('aiAssistant.dashboard.controlEffectivenessTitle')} style={{ marginTop: 16 }}>
                <Space wrap>
                  {Object.entries(dashboard.controlEffectiveness).map(([status, count]) => (
                    <Tag color={CONTROL_EFFECTIVENESS_COLORS[status] ?? 'default'} key={status}>
                      {t(CONTROL_EFFECTIVENESS_LABEL_KEYS[status] ?? status)}: {count}
                    </Tag>
                  ))}
                </Space>
              </Card>

              <Card title={t('aiAssistant.dashboard.insightsTitle')} style={{ marginTop: 16 }}>
                <ul>
                  {dashboard.insights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
                <Typography.Text type="secondary">{dashboard.disclaimer}</Typography.Text>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
