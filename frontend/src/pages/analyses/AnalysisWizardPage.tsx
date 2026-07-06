import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App, Button, Empty, Skeleton, Space, Steps, Tag, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { analysesApi } from '../../api/endpoints';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { AnalysisStage } from '../../types';
import {
  ANALYSIS_STAGE_ORDER,
  ANALYSIS_STATUS_COLORS,
  IMPLEMENTED_ANALYSIS_STAGES,
  analysisStageLabel,
  analysisStatusLabel,
} from '../../utils/analysisDisplay';
import { Stage1CreationTab } from './stages/Stage1CreationTab';
import { Stage2PlanningTab } from './stages/Stage2PlanningTab';
import { Stage3WorkingGroupTab } from './stages/Stage3WorkingGroupTab';
import { Stage4DocumentsTab } from './stages/Stage4DocumentsTab';
import { Stage5ProcessMapTab } from './stages/Stage5ProcessMapTab';
import { Stage6FactorsTab } from './stages/Stage6FactorsTab';
import { Stage7RisksTab } from './stages/Stage7RisksTab';
import { Stage8AssessmentTab } from './stages/Stage8AssessmentTab';
import { Stage9RecommendationsTab } from './stages/Stage9RecommendationsTab';
import { Stage10ActionPlanTab } from './stages/Stage10ActionPlanTab';
import { Stage11CoordinationTab } from './stages/Stage11CoordinationTab';
import { Stage12ApprovalTab } from './stages/Stage12ApprovalTab';
import { Stage13MonitoringTab } from './stages/Stage13MonitoringTab';
import { Stage14ReassessmentTab } from './stages/Stage14ReassessmentTab';
import { VakrAiPanel } from './VakrAiPanel';

export function AnalysisWizardPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [viewStage, setViewStage] = useState<AnalysisStage | null>(null);

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const currentIndex = analysis ? ANALYSIS_STAGE_ORDER.indexOf(analysis.stage) : 0;
  const activeStage = viewStage ?? analysis?.stage ?? 'CREATION';
  const activeIndex = ANALYSIS_STAGE_ORDER.indexOf(activeStage);

  const handleAdvance = async () => {
    if (!analysis) return;
    const nextStage = ANALYSIS_STAGE_ORDER[currentIndex + 1];
    if (!nextStage) return;
    try {
      await analysesApi.changeStage(analysis.id, nextStage);
      message.success(t('analysisWizard.advanced', { stage: analysisStageLabel(nextStage) }));
      setViewStage(nextStage);
      refetch();
    } catch {
      message.error(t('analysisWizard.advanceFailed'));
    }
  };

  const stageContent = useMemo(() => {
    if (!analysis) return null;
    switch (activeStage) {
      case 'CREATION':
        return <Stage1CreationTab analysis={analysis} onUpdated={refetch} />;
      case 'PLANNING':
        return <Stage2PlanningTab analysis={analysis} onUpdated={refetch} />;
      case 'WORKING_GROUP':
        return <Stage3WorkingGroupTab analysis={analysis} onUpdated={refetch} />;
      case 'DOCUMENTS':
        return <Stage4DocumentsTab analysis={analysis} onUpdated={refetch} />;
      case 'PROCESS_MAP':
        return <Stage5ProcessMapTab analysis={analysis} onUpdated={refetch} />;
      case 'FACTORS':
        return <Stage6FactorsTab analysis={analysis} onUpdated={refetch} />;
      case 'RISKS':
        return <Stage7RisksTab analysis={analysis} onUpdated={refetch} />;
      case 'ASSESSMENT':
        return <Stage8AssessmentTab analysis={analysis} onUpdated={refetch} />;
      case 'RECOMMENDATIONS':
        return <Stage9RecommendationsTab analysis={analysis} onUpdated={refetch} />;
      case 'ACTION_PLAN':
        return <Stage10ActionPlanTab analysis={analysis} onUpdated={refetch} />;
      case 'COORDINATION':
        return <Stage11CoordinationTab analysis={analysis} onUpdated={refetch} />;
      case 'APPROVAL':
        return <Stage12ApprovalTab analysis={analysis} onUpdated={refetch} />;
      case 'MONITORING':
        return <Stage13MonitoringTab analysis={analysis} onUpdated={refetch} />;
      case 'REASSESSMENT':
        return <Stage14ReassessmentTab analysis={analysis} onUpdated={refetch} />;
      default:
        return (
          <Empty
            description={t('analysisWizard.stageNotImplemented')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '48px 0' }}
          />
        );
    }
  }, [analysis, activeStage, refetch, t]);

  if (isLoading || !analysis) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate('/analyses')} style={{ paddingLeft: 0 }}>
        {t('analysisWizard.backButton')}
      </Button>

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap align="start">
        <div>
          <Space align="center">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {analysis.name}
            </Typography.Title>
            <Tag color={ANALYSIS_STATUS_COLORS[analysis.status]} style={{ fontSize: 13 }}>
              {analysisStatusLabel(analysis.status)}
            </Tag>
          </Space>
          <Typography.Text type="secondary">{analysis.code}</Typography.Text>
        </div>
        <ModuleHelpButton moduleKey="analyses" />
      </Space>

      <div style={{ overflowX: 'auto', marginBottom: 24, paddingBottom: 8 }}>
        <Steps
          size="small"
          current={activeIndex}
          style={{ minWidth: 2500 }}
          items={ANALYSIS_STAGE_ORDER.map((stage, index) => {
            const implemented = IMPLEMENTED_ANALYSIS_STAGES.includes(stage);
            const reachable = index <= currentIndex + 1;
            const clickable = reachable;
            return {
              title: (
                <Tooltip title={!implemented ? t('analysisWizard.stageComingSoon') : undefined}>
                  <span
                    style={{ cursor: clickable ? 'pointer' : 'not-allowed', opacity: implemented ? 1 : 0.5 }}
                    onClick={() => clickable && setViewStage(stage)}
                  >
                    {analysisStageLabel(stage)}
                  </span>
                </Tooltip>
              ),
              disabled: !clickable,
            };
          })}
        />
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>{stageContent}</div>

      <VakrAiPanel analysis={analysis} onUpdated={refetch} />

      {activeStage === analysis.stage && currentIndex < ANALYSIS_STAGE_ORDER.length - 1 && IMPLEMENTED_ANALYSIS_STAGES.includes(analysis.stage) && (
        <Space style={{ marginTop: 24 }}>
          <Button type="primary" onClick={handleAdvance}>
            {t('analysisWizard.advanceButton', { stage: analysisStageLabel(ANALYSIS_STAGE_ORDER[currentIndex + 1]) })}
          </Button>
        </Space>
      )}
    </div>
  );
}
