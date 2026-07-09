import { DownloadOutlined, FileOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Image, Skeleton, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { PdfViewer } from './PdfViewer';

export interface ViewableMaterial {
  id: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

interface Props {
  material: ViewableMaterial;
  downloadPath: (id: string) => string;
  onDownload: () => void;
  /** Высота PDF-области (по умолчанию 70vh) */
  pdfHeight?: string;
}

function formatSize(bytes?: number) {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const OFFICE_LABEL_BY_MIME: Record<string, string> = {
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PowerPoint',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
};

function needsBlob(mimeType: string) {
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('text/')
  );
}

/**
 * Встроенный просмотр учебного материала внутри урока: PDF — во встроенном
 * viewer, изображения/видео/аудио/текст — нативно, офисные форматы —
 * карточка с метаданными и скачиванием (просмотр без конвертации невозможен).
 */
export function InlineMaterialViewer({ material, downloadPath, onDownload, pdfHeight }: Props) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setBlobUrl(null);
    setTextContent(null);
    setLoadError(false);
    if (!needsBlob(material.mimeType)) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    apiClient
      .get(downloadPath(material.id), { responseType: 'blob' })
      .then(async (res) => {
        if (cancelled) return;
        const blob = new Blob([res.data], { type: material.mimeType });
        if (material.mimeType.startsWith('text/')) {
          setTextContent(await blob.text());
        } else {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [material.id, material.mimeType, downloadPath]);

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (loadError) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('materialViewer.loadError')}
        action={
          <Button size="small" icon={<DownloadOutlined />} onClick={onDownload}>
            {t('materialViewer.download')}
          </Button>
        }
      />
    );
  }

  if (material.mimeType === 'application/pdf' && blobUrl) {
    return (
      <PdfViewer
        fileUrl={blobUrl}
        fileName={material.fileName}
        onDownload={onDownload}
        height={pdfHeight}
      />
    );
  }

  if (material.mimeType.startsWith('image/') && blobUrl) {
    return (
      <div style={{ textAlign: 'center' }}>
        <Image
          src={blobUrl}
          alt={material.fileName}
          style={{ maxWidth: '100%', maxHeight: '70vh' }}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          {material.fileName} — {t('materialViewer.imageHint')}
        </Typography.Paragraph>
      </div>
    );
  }

  if (material.mimeType.startsWith('video/') && blobUrl) {
    return (
      <div>
        <video controls style={{ width: '100%', maxHeight: '70vh', background: '#000' }}>
          <source src={blobUrl} type={material.mimeType} />
        </video>
        <Typography.Text type="secondary">{material.fileName}</Typography.Text>
      </div>
    );
  }

  if (material.mimeType.startsWith('audio/') && blobUrl) {
    return (
      <div>
        <audio controls style={{ width: '100%' }} src={blobUrl} />
        <Typography.Text type="secondary">{material.fileName}</Typography.Text>
      </div>
    );
  }

  if (textContent !== null) {
    return (
      <Card size="small" title={material.fileName}>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
          {textContent}
        </Typography.Paragraph>
      </Card>
    );
  }

  // Офисные форматы (PPT/PPTX/DOC/DOCX/XLS/XLSX) — карточка с метаданными
  const officeLabel = OFFICE_LABEL_BY_MIME[material.mimeType];
  return (
    <Card size="small">
      <Space align="start">
        <FileOutlined style={{ fontSize: 36, color: '#1677ff' }} />
        <div>
          <Typography.Text strong style={{ display: 'block' }}>
            {material.fileName}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block' }}>
            {officeLabel
              ? t('materialViewer.officeType', { type: officeLabel })
              : material.mimeType}
            {formatSize(material.size) ? ` · ${formatSize(material.size)}` : ''}
          </Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: '8px 0' }}>
            {t('materialViewer.officeHint')}
          </Typography.Paragraph>
          <Button icon={<DownloadOutlined />} onClick={onDownload}>
            {t('materialViewer.download')}
          </Button>
        </div>
      </Space>
    </Card>
  );
}
