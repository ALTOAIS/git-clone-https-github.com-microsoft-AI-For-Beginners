import { InboxOutlined, RobotOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Dropdown, List, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { attachmentsApi } from '../../api/endpoints';
import { AttachmentViewerModal, type ViewableAttachment } from '../../components/AttachmentViewerModal';
import type { Attachment } from '../../types';
import { downloadViaApi } from '../../utils/download';

interface Props {
  lessonId: string;
  canEdit: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LessonAttachmentsPanel({ lessonId, canEdit }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<ViewableAttachment | null>(null);

  const goToAiStudio = (action: 'course' | 'memo' | 'quiz', materialId: string) =>
    navigate(`/academy/management?tab=aiStudio&action=${action}&materialId=${materialId}`);

  const queryKey = ['lesson-attachments', lessonId];
  const { data: attachments } = useQuery({
    queryKey,
    queryFn: () => attachmentsApi.listForEntity('COURSE_LESSON', lessonId).then((r) => r.data),
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey });

  const uploadProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        await attachmentsApi.upload(file as File, 'COURSE_LESSON', lessonId);
        message.success(t('lessonAttachments.uploaded'));
        onSuccess?.({});
        refetch();
      } catch (err) {
        message.error(t('lessonAttachments.uploadFailed'));
        onError?.(err as Error);
      }
    },
  };

  const handleDelete = async (id: string) => {
    await attachmentsApi.remove(id);
    message.success(t('lessonAttachments.removed'));
    refetch();
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
          <p className="ant-upload-text">{t('lessonAttachments.dragText')}</p>
          <p className="ant-upload-hint">{t('lessonAttachments.dragHint')}</p>
        </Upload.Dragger>
      )}
      <List
        bordered
        dataSource={attachments ?? []}
        locale={{ emptyText: t('lessonAttachments.noAttachmentsYet') }}
        renderItem={(attachment) => (
          <List.Item
            actions={[
              <a key="view" onClick={() => setViewing(attachment)}>
                {t('lessonAttachments.view')}
              </a>,
              <a key="download" onClick={() => handleDownload(attachment)}>
                {t('lessonAttachments.download')}
              </a>,
              ...(canEdit
                ? [
                    <Dropdown
                      key="ai"
                      menu={{
                        items: [
                          { key: 'course', label: t('lessonAttachments.aiCreateCourse') },
                          { key: 'memo', label: t('lessonAttachments.aiCreateMemo') },
                          { key: 'quiz', label: t('lessonAttachments.aiCreateQuiz') },
                        ],
                        onClick: ({ key }) =>
                          goToAiStudio(key as 'course' | 'memo' | 'quiz', attachment.id),
                      }}
                    >
                      <a>
                        <RobotOutlined /> {t('lessonAttachments.aiActions')}
                      </a>
                    </Dropdown>,
                    <a key="delete" onClick={() => handleDelete(attachment.id)}>
                      {t('lessonAttachments.delete')}
                    </a>,
                  ]
                : []),
            ]}
          >
            <List.Item.Meta
              title={attachment.fileName}
              description={
                <Typography.Text type="secondary">
                  {formatSize(attachment.size)} · {t('lessonAttachments.uploadedByPrefix')}{' '}
                  {attachment.uploadedBy?.fullName ?? t('common.unknown')}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
      <AttachmentViewerModal attachment={viewing} downloadPath={attachmentsApi.downloadPath} onClose={() => setViewing(null)} />
    </div>
  );
}
