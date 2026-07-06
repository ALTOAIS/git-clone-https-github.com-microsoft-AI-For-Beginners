import { CheckCircleFilled } from '@ant-design/icons';
import { Alert, Button, Descriptions, Popconfirm, Space, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisDetail } from '../../../types';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

export function Stage12ApprovalTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const [approving, setApproving] = useState(false);

  const linkedRisks = analysis.risks.filter((r) => r.linkedRiskId).length;
  const linkedActions = analysis.actionItems.filter((a) => a.linkedActionId).length;
  const isApproved = analysis.status === 'COMPLETED';

  const handleApprove = async () => {
    setApproving(true);
    try {
      await analysesApi.approve(analysis.id);
      message.success(t('analysisStage12.approved'));
      onUpdated();
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <span style={{ color: '#8c8c8c', display: 'block', marginBottom: 16 }}>
        {t('analysisStage12.intro')}
        <InfoTooltip text={t('tooltips.analyses.approval')} />
      </span>

      <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label={t('analysisStage12.risksTotal')}>{analysis.risks.length}</Descriptions.Item>
        <Descriptions.Item label={t('analysisStage12.risksLinked')}>{linkedRisks}</Descriptions.Item>
        <Descriptions.Item label={t('analysisStage12.actionsTotal')}>{analysis.actionItems.length}</Descriptions.Item>
        <Descriptions.Item label={t('analysisStage12.actionsLinked')}>{linkedActions}</Descriptions.Item>
      </Descriptions>

      {isApproved ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleFilled />}
          message={t('analysisStage12.alreadyApproved')}
          description={t('analysisStage12.alreadyApprovedDescription')}
        />
      ) : (
        <Space direction="vertical">
          <Alert type="info" showIcon message={t('analysisStage12.approveWarning')} style={{ maxWidth: 640 }} />
          <Popconfirm
            title={t('analysisStage12.confirmTitle')}
            description={t('analysisStage12.confirmDescription')}
            onConfirm={handleApprove}
            okText={t('analysisStage12.confirmOk')}
            cancelText={t('common.cancel')}
          >
            <Button type="primary" loading={approving}>
              {t('analysisStage12.approveButton')}
            </Button>
          </Popconfirm>
        </Space>
      )}
    </div>
  );
}
