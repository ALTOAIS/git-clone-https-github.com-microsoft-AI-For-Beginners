import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Skeleton, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { analysesApi } from '../../api/endpoints';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { ANALYSIS_STATUS_COLORS, analysisStatusLabel } from '../../utils/analysisDisplay';
import { AdvancedAnalysisWizard } from './AdvancedAnalysisWizard';
import { SimplifiedAnalysisWizard } from './SimplifiedAnalysisWizard';
import { VakrAiPanel } from './VakrAiPanel';

export function AnalysisWizardPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const advanced = searchParams.get('mode') === 'advanced';

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

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
        <Space>
          <a
            onClick={() =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (advanced) {
                  next.delete('mode');
                } else {
                  next.set('mode', 'advanced');
                }
                return next;
              })
            }
          >
            {advanced ? t('analysisWizard.simpleModeLink') : t('analysisWizard.advancedModeLink')}
          </a>
          <ModuleHelpButton moduleKey="analyses" />
        </Space>
      </Space>

      {advanced ? (
        <AdvancedAnalysisWizard analysis={analysis} onUpdated={refetch} />
      ) : (
        <SimplifiedAnalysisWizard analysis={analysis} onUpdated={refetch} />
      )}

      <VakrAiPanel analysis={analysis} onUpdated={refetch} />
    </div>
  );
}
