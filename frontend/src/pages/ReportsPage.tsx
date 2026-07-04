import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Row, Space, Typography } from 'antd';
import { useState } from 'react';
import { reportsApi } from '../api/endpoints';
import { downloadViaApi } from '../utils/download';

const TABLE_REPORTS = [
  { kind: 'risk-register', title: 'Risk Register', description: 'Full export of all risks with scores and ownership.' },
  { kind: 'action-plan', title: 'Action Plan Report', description: 'All action plans with owners, deadlines and status.' },
  { kind: 'critical-risks', title: 'Critical Risks', description: 'Active risks with an inherent score of 15 or higher.' },
  { kind: 'overdue-actions', title: 'Overdue Actions', description: 'Action plans past their deadline and not yet completed.' },
] as const;

const PDF_REPORTS = [
  { kind: 'board', title: 'Board Report', description: 'Executive summary for the Board of Directors.' },
  { kind: 'audit-committee', title: 'Audit Committee Report', description: 'Control effectiveness and critical risks for Internal Audit.' },
  { kind: 'compliance', title: 'Compliance Report', description: 'Risk trend, top sources and categories for the compliance function.' },
] as const;

export function ReportsPage() {
  const { message } = App.useApp();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleTableDownload = async (kind: string, format: 'csv' | 'xlsx') => {
    const key = `${kind}-${format}`;
    setLoadingKey(key);
    try {
      await downloadViaApi(reportsApi.exportPath(kind, format), `${kind}.${format}`);
    } catch {
      message.error('Failed to generate report');
    } finally {
      setLoadingKey(null);
    }
  };

  const handlePdfDownload = async (kind: 'board' | 'audit-committee' | 'compliance') => {
    setLoadingKey(kind);
    try {
      await downloadViaApi(reportsApi.pdfPath(kind), `${kind}-report.pdf`);
    } catch {
      message.error('Failed to generate report');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div>
      <Typography.Title level={3}>Reports</Typography.Title>
      <Typography.Paragraph type="secondary">
        Generate management and regulatory reports directly from live Risk Register data.
      </Typography.Paragraph>

      <Typography.Title level={5}>Data Exports</Typography.Title>
      <Row gutter={16}>
        {TABLE_REPORTS.map((report) => (
          <Col xs={24} md={12} lg={6} key={report.kind} style={{ marginBottom: 16 }}>
            <Card title={report.title} styles={{ body: { minHeight: 90 } }}>
              <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
                {report.description}
              </Typography.Paragraph>
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  loading={loadingKey === `${report.kind}-csv`}
                  onClick={() => handleTableDownload(report.kind, 'csv')}
                >
                  CSV
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  loading={loadingKey === `${report.kind}-xlsx`}
                  onClick={() => handleTableDownload(report.kind, 'xlsx')}
                >
                  Excel
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Typography.Title level={5} style={{ marginTop: 16 }}>
        Narrative Reports
      </Typography.Title>
      <Row gutter={16}>
        {PDF_REPORTS.map((report) => (
          <Col xs={24} md={8} key={report.kind} style={{ marginBottom: 16 }}>
            <Card title={report.title}>
              <Typography.Paragraph type="secondary" style={{ minHeight: 44 }}>
                {report.description}
              </Typography.Paragraph>
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                loading={loadingKey === report.kind}
                onClick={() => handlePdfDownload(report.kind)}
              >
                Download PDF
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
