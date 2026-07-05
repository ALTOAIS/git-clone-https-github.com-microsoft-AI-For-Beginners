import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App, Button, Dropdown, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { risksApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { RISK_STATUS_COLORS, riskStatusLabel } from '../../utils/riskDisplay';
import { RISK_LIFECYCLE } from '../../utils/riskLifecycle';
import { RiskInfoTab } from './tabs/RiskInfoTab';
import { RiskAssessmentTab } from './tabs/RiskAssessmentTab';
import { RiskSourcesTab } from './tabs/RiskSourcesTab';
import { RiskControlsTab } from './tabs/RiskControlsTab';
import { RiskActionsTab } from './tabs/RiskActionsTab';
import { RiskCommentsTab } from './tabs/RiskCommentsTab';
import { RiskHistoryTab } from './tabs/RiskHistoryTab';
import { RiskAttachmentsTab } from './tabs/RiskAttachmentsTab';

const EDIT_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER', 'RISK_OWNER'];

export function RiskCardPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const canEdit = !!user && EDIT_ROLES.includes(user.role);

  const { data: risk, isLoading, refetch } = useQuery({
    queryKey: ['risk', id],
    queryFn: () => risksApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading || !risk) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const allowedTransitions = RISK_LIFECYCLE[risk.status] ?? [];

  const handleTransition = async (status: string) => {
    try {
      await risksApi.changeStatus(risk.id, status);
      message.success(t('riskCard.statusChangedTo', { status: riskStatusLabel(status as any) }));
      refetch();
    } catch {
      message.error(t('riskCard.transitionNotAllowed'));
    }
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="link" onClick={() => navigate('/risks')} style={{ paddingLeft: 0 }}>
        {t('riskCard.backButton')}
      </Button>

      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap align="start">
        <div>
          <Space align="center">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {risk.title}
            </Typography.Title>
            <Tag color={RISK_STATUS_COLORS[risk.status]} style={{ fontSize: 13 }}>
              {riskStatusLabel(risk.status)}
            </Tag>
          </Space>
          <Typography.Text type="secondary">{risk.code}</Typography.Text>
        </div>

        <Space>
          {canEdit && allowedTransitions.length > 0 && (
            <Dropdown
              menu={{
                items: allowedTransitions.map((status) => ({
                  key: status,
                  label: t('riskCard.moveTo', { status: riskStatusLabel(status) }),
                  onClick: () => handleTransition(status),
                })),
              }}
            >
              <Button type="primary">{t('riskCard.changeStatusButton')}</Button>
            </Dropdown>
          )}
          <ModuleHelpButton moduleKey="riskRegister" />
        </Space>
      </Space>

      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: t('riskCard.tabs.info'),
            children: <RiskInfoTab risk={risk} onUpdated={refetch} canEdit={canEdit} />,
          },
          {
            key: 'assessment',
            label: t('riskCard.tabs.assessment'),
            children: <RiskAssessmentTab risk={risk} onUpdated={refetch} canEdit={canEdit} />,
          },
          {
            key: 'sources',
            label: `${t('riskCard.tabs.sources')} (${risk.sources.length})`,
            children: <RiskSourcesTab risk={risk} onUpdated={refetch} canEdit={canEdit} />,
          },
          {
            key: 'controls',
            label: `${t('riskCard.tabs.controls')} (${risk.controls.length})`,
            children: <RiskControlsTab risk={risk} onUpdated={refetch} canEdit={canEdit} />,
          },
          {
            key: 'actions',
            label: `${t('riskCard.tabs.actions')} (${risk.actions.length})`,
            children: <RiskActionsTab risk={risk} onUpdated={refetch} canEdit={canEdit} />,
          },
          {
            key: 'comments',
            label: `${t('riskCard.tabs.comments')} (${risk.comments.length})`,
            children: <RiskCommentsTab risk={risk} onUpdated={refetch} />,
          },
          {
            key: 'attachments',
            label: `${t('riskCard.tabs.attachments')} (${risk.attachments.length})`,
            children: <RiskAttachmentsTab risk={risk} onUpdated={refetch} canEdit={canEdit} />,
          },
          {
            key: 'history',
            label: t('riskCard.tabs.history'),
            children: <RiskHistoryTab risk={risk} />,
          },
        ]}
      />
    </div>
  );
}
