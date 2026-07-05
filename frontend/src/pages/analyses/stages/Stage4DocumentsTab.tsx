import { InboxOutlined } from '@ant-design/icons';
import { App, List, Select, Space, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysesApi } from '../../../api/endpoints';
import { InfoTooltip } from '../../../components/InfoTooltip';
import type { AnalysisDetail, AnalysisDocument } from '../../../types';
import { ALL_ANALYSIS_DOCUMENT_CATEGORIES, analysisDocumentCategoryLabel } from '../../../utils/analysisDisplay';
import { downloadViaApi } from '../../../utils/download';

interface Props {
  analysis: AnalysisDetail;
  onUpdated: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Stage4DocumentsTab({ analysis, onUpdated }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [category, setCategory] = useState<string>('OTHER');

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        await analysesApi.uploadDocument(analysis.id, file as File, category);
        message.success(t('analysisStage4.uploaded'));
        onSuccess?.({});
        onUpdated();
      } catch (err) {
        message.error(t('analysisStage4.uploadFailed'));
        onError?.(err as Error);
      }
    },
  };

  const handleDelete = async (docId: string) => {
    await analysesApi.removeDocument(analysis.id, docId);
    message.success(t('analysisStage4.removed'));
    onUpdated();
  };

  const handleDownload = async (document: AnalysisDocument) => {
    await downloadViaApi(analysesApi.downloadDocumentPath(analysis.id, document.id), document.fileName);
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <span style={{ color: '#8c8c8c' }}>
          {t('analysisStage4.intro')}
          <InfoTooltip text={t('tooltips.analyses.documents')} />
        </span>
        <Space>
          <span>
            {t('analysisStage4.categoryLabel')}
            <InfoTooltip text={t('tooltips.analyses.documentCategory')} />
          </span>
          <Select
            style={{ width: 260 }}
            value={category}
            onChange={setCategory}
            options={ALL_ANALYSIS_DOCUMENT_CATEGORIES.map((value) => ({ value, label: analysisDocumentCategoryLabel(value) }))}
          />
        </Space>
      </Space>

      <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">{t('analysisStage4.dragText')}</p>
        <p className="ant-upload-hint">{t('analysisStage4.dragHint')}</p>
      </Upload.Dragger>

      <List
        bordered
        dataSource={analysis.documents}
        locale={{ emptyText: t('analysisStage4.noDocumentsYet') }}
        renderItem={(document) => (
          <List.Item
            actions={[
              <a key="download" onClick={() => handleDownload(document)}>
                {t('analysisStage4.download')}
              </a>,
              <a key="delete" onClick={() => handleDelete(document.id)}>
                {t('analysisStage4.delete')}
              </a>,
            ]}
          >
            <List.Item.Meta
              title={document.fileName}
              description={
                <Space>
                  <Tag>{analysisDocumentCategoryLabel(document.category)}</Tag>
                  <Typography.Text type="secondary">
                    {formatSize(document.size)} · {t('analysisStage4.uploadedByPrefix')} {document.uploadedBy?.fullName ?? t('common.unknown')}
                  </Typography.Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
