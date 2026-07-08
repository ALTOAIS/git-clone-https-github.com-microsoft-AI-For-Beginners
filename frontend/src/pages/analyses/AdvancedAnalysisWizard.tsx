import { App, Button, Empty, Space, Steps, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../api/endpoints';
import type { AnalysisDetail, AnalysisStage } from '../../types';
import {
  ANALYSIS_STAGE_ORDER,
  IMPLEMENTED_ANALYSIS_STAGES,
  analysisStageLabel,
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

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function AdvancedAnalysisWizard({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [viewStage, setViewStage] = useState<AnalysisStage | null>(null);

  const currentIndex = ANALYSIS_STAGE_ORDER.indexOf(analysis.stage);
  const activeStage = viewStage ?? analysis.stage;
  const activeIndex = ANALYSIS_STAGE_ORDER.indexOf(activeStage);

  const handleAdvance = async () => {
    const nextStage = ANALYSIS_STAGE_ORDER[currentIndex + 1];
    if (!nextStage) return;
    try {
      await analysesApi.changeStage(analysis.id, nextStage);
      message.success(t('analysisWizard.advanced', { stage: analysisStageLabel(nextStage) }));
      setViewStage(nextStage);
      onUpdated();
    } catch {
      message.error(t('analysisWizard.advanceFailed'));
    }
  };

  const stageContent = useMemo(() => {
    switch (activeStage) {
      case 'CREATION':
        return <Stage1CreationTab analysis={analysis} onUpdated={onUpdated} />;
      case 'PLANNING':
        return <Stage2PlanningTab analysis={analysis} onUpdated={onUpdated} />;
      case 'WORKING_GROUP':
        return <Stage3WorkingGroupTab analysis={analysis} onUpdated={onUpdated} />;
      case 'DOCUMENTS':
        return <Stage4DocumentsTab analysis={analysis} onUpdated={onUpdated} />;
      case 'PROCESS_MAP':
        return <Stage5ProcessMapTab analysis={analysis} onUpdated={onUpdated} />;
      case 'FACTORS':
        return <Stage6FactorsTab analysis={analysis} onUpdated={onUpdated} />;
      case 'RISKS':
        return <Stage7RisksTab analysis={analysis} onUpdated={onUpdated} />;
      case 'ASSESSMENT':
        return <Stage8AssessmentTab analysis={analysis} onUpdated={onUpdated} />;
      case 'RECOMMENDATIONS':
        return <Stage9RecommendationsTab analysis={analysis} onUpdated={onUpdated} />;
      case 'ACTION_PLAN':
        return <Stage10ActionPlanTab analysis={analysis} onUpdated={onUpdated} />;
      case 'COORDINATION':
        return <Stage11CoordinationTab analysis={analysis} onUpdated={onUpdated} />;
      case 'APPROVAL':
        return <Stage12ApprovalTab analysis={analysis} onUpdated={onUpdated} />;
      case 'MONITORING':
        return <Stage13MonitoringTab analysis={analysis} onUpdated={onUpdated} />;
      case 'REASSESSMENT':
        return <Stage14ReassessmentTab analysis={analysis} onUpdated={onUpdated} />;
      default:
        return (
          <Empty
            description={t('analysisWizard.stageNotImplemented')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '48px 0' }}
          />
        );
    }
  }, [analysis, activeStage, onUpdated, t]);

  return (
    <div>
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

      {activeStage === analysis.stage &&
        currentIndex < ANALYSIS_STAGE_ORDER.length - 1 &&
        IMPLEMENTED_ANALYSIS_STAGES.includes(analysis.stage) && (
          <Space style={{ marginTop: 24 }}>
            <Button type="primary" onClick={handleAdvance}>
              {t('analysisWizard.advanceButton', { stage: analysisStageLabel(ANALYSIS_STAGE_ORDER[currentIndex + 1]) })}
            </Button>
          </Space>
        )}
    </div>
  );
}
