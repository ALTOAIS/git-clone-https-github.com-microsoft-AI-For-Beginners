import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Row, Space, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../api/endpoints';
import { InfoTooltip } from '../components/InfoTooltip';
import { ModuleHelpButton } from '../components/ModuleHelpButton';
import { downloadViaApi } from '../utils/download';

const TABLE_REPORT_KINDS = ['risk-register', 'action-plan', 'critical-risks', 'overdue-actions'] as const;
const PDF_REPORT_KINDS = ['board', 'audit-committee', 'compliance'] as const;

const TABLE_REPORT_I18N_KEY: Record<(typeof TABLE_REPORT_KINDS)[number], string> = {
  'risk-register': 'riskRegister',
  'action-plan': 'actionPlan',
  'critical-risks': 'criticalRisks',
  'overdue-actions': 'overdueActions',
};

const PDF_REPORT_I18N_KEY: Record<(typeof PDF_REPORT_KINDS)[number], string> = {
  board: 'board',
  'audit-committee': 'auditCommittee',
  compliance: 'compliance',
};

export function ReportsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleTableDownload = async (kind: string, format: 'csv' | 'xlsx') => {
    const key = `${kind}-${format}`;
    setLoadingKey(key);
    try {
      await downloadViaApi(reportsApi.exportPath(kind, format), `${kind}.${format}`);
    } catch {
      message.error(t('reports.downloadFailed'));
    } finally {
      setLoadingKey(null);
    }
  };

  const handlePdfDownload = async (kind: 'board' | 'audit-committee' | 'compliance') => {
    setLoadingKey(kind);
    try {
      await downloadViaApi(reportsApi.pdfPath(kind), `${kind}-report.pdf`);
    } catch {
      message.error(t('reports.downloadFailed'));
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3}>
          {t('reports.title')}
          <InfoTooltip text={t('tooltips.reports.dataSource')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="reports" />
      </Space>
      <Typography.Paragraph type="secondary">{t('reports.description')}</Typography.Paragraph>

      <Typography.Title level={5}>
        {t('reports.dataExportsHeading')}
        <InfoTooltip text={t('tooltips.reports.reportContent')} />
      </Typography.Title>
      <Row gutter={16}>
        {TABLE_REPORT_KINDS.map((kind) => (
          <Col xs={24} md={12} lg={6} key={kind} style={{ marginBottom: 16 }}>
            <Card title={t(`reports.${TABLE_REPORT_I18N_KEY[kind]}.title`)} styles={{ body: { minHeight: 90 } }}>
              <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
                {t(`reports.${TABLE_REPORT_I18N_KEY[kind]}.description`)}
              </Typography.Paragraph>
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  loading={loadingKey === `${kind}-csv`}
                  onClick={() => handleTableDownload(kind, 'csv')}
                >
                  {t('common.csv')}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  loading={loadingKey === `${kind}-xlsx`}
                  onClick={() => handleTableDownload(kind, 'xlsx')}
                >
                  {t('common.excel')}
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={5} style={{ marginTop: 16 }}>
        {t('reports.narrativeReportsHeading')}
        <InfoTooltip text={t('tooltips.reports.period')} />
      </Typography.Title>
      <Row gutter={16}>
        {PDF_REPORT_KINDS.map((kind) => (
          <Col xs={24} md={8} key={kind} style={{ marginBottom: 16 }}>
            <Card title={t(`reports.${PDF_REPORT_I18N_KEY[kind]}.title`)}>
              <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
                {t(`reports.${PDF_REPORT_I18N_KEY[kind]}.description`)}
              </Typography.Paragraph>
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                loading={loadingKey === kind}
                onClick={() => handlePdfDownload(kind)}
              >
                {t('common.downloadPdf')}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
