import { FilePdfOutlined, FileWordOutlined, MessageOutlined } from '@ant-design/icons';
import { App, Badge, Button, Card, Descriptions, Drawer, List, Popconfirm, Result, Space, Steps, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { aiApi, analysesApi } from '../../api/endpoints';
import type { AiReportResult, AnalysisDetail } from '../../types';
import { ANALYSIS_STAGE_ORDER, recommendationTypeLabel } from '../../utils/analysisDisplay';
import { downloadViaApi } from '../../utils/download';
import { ACTION_STATUS_COLORS, SCORE_LEVEL_COLORS, actionStatusLabel, scoreLevel } from '../../utils/riskDisplay';
import { AnalysisCommentsPanel } from './AnalysisCommentsPanel';
import { Stage1CreationTab } from './stages/Stage1CreationTab';
import { Stage4DocumentsTab } from './stages/Stage4DocumentsTab';
import { Stage5ProcessMapTab } from './stages/Stage5ProcessMapTab';
import { Stage6FactorsTab } from './stages/Stage6FactorsTab';
import { Stage7RisksTab } from './stages/Stage7RisksTab';
import { Stage8AssessmentTab } from './stages/Stage8AssessmentTab';
import { Stage9RecommendationsTab } from './stages/Stage9RecommendationsTab';
import { Stage10ActionPlanTab } from './stages/Stage10ActionPlanTab';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

const SIMPLE_STEPS = ['card', 'documents', 'processesAndRisks', 'recommendations', 'report'] as const;

function ScoreTag({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <Typography.Text type="secondary">—</Typography.Text>;
  const level = scoreLevel(value);
  return (
    <Tag color={level ? SCORE_LEVEL_COLORS[level] : undefined} style={{ color: '#fff' }}>
      {value}
    </Tag>
  );
}

export function SimplifiedAnalysisWizard({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<AiReportResult | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const isCompleted = analysis.status === 'COMPLETED';

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const { data } = await aiApi.generateVakrReport(analysis.id);
      setReport(data);
      setReportOpen(true);
    } catch {
      message.error(t('simplifiedAnalysis.reportFailed'));
    } finally {
      setLoadingReport(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const approvalIndex = ANALYSIS_STAGE_ORDER.indexOf('APPROVAL');
      let current = analysis.stage;
      while (ANALYSIS_STAGE_ORDER.indexOf(current) < approvalIndex) {
        const next = ANALYSIS_STAGE_ORDER[ANALYSIS_STAGE_ORDER.indexOf(current) + 1];
        await analysesApi.changeStage(analysis.id, next);
        current = next;
      }
      await analysesApi.approve(analysis.id);
      message.success(t('simplifiedAnalysis.finished'));
      onUpdated();
    } catch {
      message.error(t('simplifiedAnalysis.finishFailed'));
    } finally {
      setFinishing(false);
    }
  };

  const finishStepContent = isCompleted ? (
    <Result
      status="success"
      title={t('simplifiedAnalysis.finish.completedTitle')}
      subTitle={
        analysis.completedAt
          ? `${t('simplifiedAnalysis.finish.completedOn')}: ${new Date(analysis.completedAt).toLocaleDateString('ru-RU')}`
          : undefined
      }
      extra={
        <Space>
          <Button type="primary" onClick={() => navigate('/risks')}>
            {t('simplifiedAnalysis.finish.goToRisks')}
          </Button>
          <Button onClick={() => navigate('/actions')}>{t('simplifiedAnalysis.finish.goToActions')}</Button>
        </Space>
      }
    />
  ) : (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Descriptions bordered column={3} size="small">
        <Descriptions.Item label={t('simplifiedAnalysis.finish.risksCount')}>{analysis.risks.length}</Descriptions.Item>
        <Descriptions.Item label={t('simplifiedAnalysis.finish.recommendationsCount')}>
          {analysis.recommendations.length}
        </Descriptions.Item>
        <Descriptions.Item label={t('simplifiedAnalysis.finish.actionsCount')}>{analysis.actionItems.length}</Descriptions.Item>
      </Descriptions>

      <Card size="small" title={t('simplifiedAnalysis.finish.risksTitle')}>
        <List
          size="small"
          dataSource={analysis.risks}
          locale={{ emptyText: t('simplifiedAnalysis.finish.noRisks') }}
          renderItem={(risk) => (
            <List.Item extra={<ScoreTag value={risk.score} />}>
              <List.Item.Meta title={risk.title} description={risk.cause ?? undefined} />
            </List.Item>
          )}
        />
      </Card>

      <Card size="small" title={t('simplifiedAnalysis.finish.recommendationsTitle')}>
        <List
          size="small"
          dataSource={analysis.recommendations}
          locale={{ emptyText: t('simplifiedAnalysis.finish.noRecommendations') }}
          renderItem={(rec) => (
            <List.Item extra={<Tag>{recommendationTypeLabel(rec.type)}</Tag>}>
              <List.Item.Meta title={rec.description} description={rec.responsible?.fullName} />
            </List.Item>
          )}
        />
      </Card>

      <Card size="small" title={t('simplifiedAnalysis.finish.actionsTitle')}>
        <List
          size="small"
          dataSource={analysis.actionItems}
          locale={{ emptyText: t('simplifiedAnalysis.finish.noActions') }}
          renderItem={(item) => (
            <List.Item extra={<Tag color={ACTION_STATUS_COLORS[item.status]}>{actionStatusLabel(item.status)}</Tag>}>
              <List.Item.Meta
                title={item.task}
                description={[item.responsible?.fullName, item.deadline ? new Date(item.deadline).toLocaleDateString('ru-RU') : null]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </List.Item>
          )}
        />
      </Card>

      <Space wrap>
        <Button loading={loadingReport} onClick={handleGenerateReport}>
          {t('simplifiedAnalysis.finish.generateReportButton')}
        </Button>
        <Popconfirm
          title={t('simplifiedAnalysis.finish.confirmTitle')}
          description={t('simplifiedAnalysis.finish.confirmDescription')}
          okText={t('simplifiedAnalysis.finish.confirmOk')}
          cancelText={t('common.cancel')}
          onConfirm={handleFinish}
        >
          <Button type="primary" loading={finishing}>
            {t('simplifiedAnalysis.finish.finishButton')}
          </Button>
        </Popconfirm>
      </Space>
    </Space>
  );

  const stepContents = [
    <Stage1CreationTab key="card" analysis={analysis} onUpdated={onUpdated} />,
    <Space key="documents" direction="vertical" size="large" style={{ width: '100%' }}>
      <Card size="small" title={t('simplifiedAnalysis.step2.contextTitle')}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('simplifiedAnalysis.step2.departments')}>
            {analysis.departments.length ? (
              <Space wrap>
                {analysis.departments.map((d) => (
                  <Tag key={d.id}>{d.department.name}</Tag>
                ))}
              </Space>
            ) : (
              '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t('simplifiedAnalysis.step2.subject')}>{analysis.subject || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Stage4DocumentsTab analysis={analysis} onUpdated={onUpdated} />
    </Space>,
    <Space key="processesAndRisks" direction="vertical" size="large" style={{ width: '100%' }}>
      <Stage5ProcessMapTab analysis={analysis} onUpdated={onUpdated} />
      <Stage6FactorsTab analysis={analysis} onUpdated={onUpdated} />
      <Stage7RisksTab analysis={analysis} onUpdated={onUpdated} />
      <Stage8AssessmentTab analysis={analysis} onUpdated={onUpdated} />
    </Space>,
    <Space key="recommendations" direction="vertical" size="large" style={{ width: '100%' }}>
      <Stage9RecommendationsTab analysis={analysis} onUpdated={onUpdated} />
      <Stage10ActionPlanTab analysis={analysis} onUpdated={onUpdated} />
    </Space>,
    <div key="report">{finishStepContent}</div>,
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Steps
          size="small"
          current={step}
          onChange={setStep}
          items={SIMPLE_STEPS.map((key) => ({ title: t(`simplifiedAnalysis.steps.${key}`) }))}
          style={{ flex: 1, minWidth: 360 }}
        />
        <Badge count={analysis.comments.length} size="small" offset={[-6, 6]}>
          <Button icon={<MessageOutlined />} onClick={() => setCommentsOpen(true)}>
            {t('simplifiedAnalysis.commentsButton')}
          </Button>
        </Badge>
      </Space>

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>{stepContents[step]}</div>

      <Drawer
        title={t('simplifiedAnalysis.commentsDrawerTitle')}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        width={480}
        destroyOnHidden
      >
        <AnalysisCommentsPanel analysis={analysis} onUpdated={onUpdated} />
      </Drawer>

      <Drawer
        title={report?.title}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        width={560}
        destroyOnHidden
        extra={
          report && (
            <Space>
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => downloadViaApi(aiApi.vakrReportPdfPath(analysis.id), `vakr-report-${Date.now()}.pdf`)}
              >
                PDF
              </Button>
              <Button
                icon={<FileWordOutlined />}
                onClick={() => downloadViaApi(aiApi.vakrReportDocxPath(analysis.id), `vakr-report-${Date.now()}.docx`)}
              >
                Word
              </Button>
            </Space>
          )
        }
      >
        {report?.sections.map((section) => (
          <div key={section.heading} style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>{section.heading}</Typography.Title>
            <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{section.content}</Typography.Paragraph>
          </div>
        ))}
      </Drawer>
    </div>
  );
}
