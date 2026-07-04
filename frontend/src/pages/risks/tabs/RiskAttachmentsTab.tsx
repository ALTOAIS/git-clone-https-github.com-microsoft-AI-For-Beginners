import { InboxOutlined } from '@ant-design/icons';
import { App, List, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { attachmentsApi } from '../../../api/endpoints';
import type { Attachment, RiskDetail } from '../../../types';
import { downloadViaApi } from '../../../utils/download';

interface Props {
  risk: RiskDetail;
  onUpdated: () => void;
  canEdit: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RiskAttachmentsTab({ risk, onUpdated, canEdit }: Props) {
  const { message } = App.useApp();

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        await attachmentsApi.upload(file as File, 'RISK', risk.id, risk.id);
        message.success('File uploaded');
        onSuccess?.({});
        onUpdated();
      } catch (err) {
        message.error('Upload failed');
        onError?.(err as Error);
      }
    },
  };

  const handleDelete = async (id: string) => {
    await attachmentsApi.remove(id);
    message.success('Attachment removed');
    onUpdated();
  };

  const handleDownload = async (attachment: Attachment) => {
    await downloadViaApi(attachmentsApi.downloadPath(attachment.id), attachment.fileName);
  };

  return (
    <div>
      {canEdit && (
        <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag a file to upload</p>
          <p className="ant-upload-hint">PDF, Word, Excel, images or CSV up to 20MB</p>
        </Upload.Dragger>
      )}
      <List
        bordered
        dataSource={risk.attachments}
        locale={{ emptyText: 'No attachments yet' }}
        renderItem={(attachment) => (
          <List.Item
            actions={[
              <a key="download" onClick={() => handleDownload(attachment)}>
                Download
              </a>,
              ...(canEdit ? [<a key="delete" onClick={() => handleDelete(attachment.id)}>Delete</a>] : []),
            ]}
          >
            <List.Item.Meta
              title={attachment.fileName}
              description={
                <Typography.Text type="secondary">
                  {formatSize(attachment.size)} · uploaded by {attachment.uploadedBy?.fullName ?? 'Unknown'}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
