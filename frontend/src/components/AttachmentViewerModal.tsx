import { Alert, Button, Modal, Skeleton, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { downloadViaApi } from '../utils/download';

export interface ViewableAttachment {
  id: string;
  fileName: string;
  mimeType: string;
}

interface Props {
  attachment: ViewableAttachment | null;
  downloadPath: (id: string) => string;
  onClose: () => void;
}

function isViewable(mimeType: string) {
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('text/')
  );
}

export function AttachmentViewerModal({ attachment, downloadPath, onClose }: Props) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attachment) {
      setBlobUrl(null);
      setTextContent(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setTextContent(null);
    apiClient
      .get(downloadPath(attachment.id), { responseType: 'blob' })
      .then(async (res) => {
        if (cancelled) return;
        const blob = new Blob([res.data], { type: attachment.mimeType });
        if (attachment.mimeType.startsWith('text/')) {
          setTextContent(await blob.text());
        } else {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachment, downloadPath]);

  const handleDownload = () => {
    if (attachment) downloadViaApi(downloadPath(attachment.id), attachment.fileName);
  };

  const renderBody = () => {
    if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (!attachment) return null;
    if (!isViewable(attachment.mimeType)) {
      return <Alert type="info" showIcon message={t('attachmentViewer.unsupportedType')} />;
    }
    if (attachment.mimeType === 'application/pdf' && blobUrl) {
      return <iframe title={attachment.fileName} src={blobUrl} style={{ width: '100%', height: '75vh', border: 'none' }} />;
    }
    if (attachment.mimeType.startsWith('image/') && blobUrl) {
      return <img src={blobUrl} alt={attachment.fileName} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />;
    }
    if (attachment.mimeType.startsWith('video/') && blobUrl) {
      return (
        <video controls style={{ width: '100%', maxHeight: '75vh' }}>
          <source src={blobUrl} type={attachment.mimeType} />
        </video>
      );
    }
    if (attachment.mimeType.startsWith('audio/') && blobUrl) {
      return <audio controls style={{ width: '100%' }} src={blobUrl} />;
    }
    if (textContent !== null) {
      return (
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '75vh', overflow: 'auto', margin: 0 }}>{textContent}</pre>
      );
    }
    return null;
  };

  return (
    <Modal
      title={attachment?.fileName}
      open={!!attachment}
      onCancel={onClose}
      width={800}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleDownload}>{t('attachmentViewer.download')}</Button>
          <Button type="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </Space>
      }
    >
      {renderBody()}
    </Modal>
  );
}
