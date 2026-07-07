import { FileOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { List, Space, Tag, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { attachmentsApi } from '../../api/endpoints';
import type { CourseLesson } from '../../types';
import { downloadViaApi } from '../../utils/download';
import { lessonContentTypeLabel } from '../../utils/academyDisplay';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  lesson: CourseLesson;
  footer?: React.ReactNode;
}

export function LessonContentView({ lesson, footer }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag>{lessonContentTypeLabel(lesson.contentType)}</Tag>
        {lesson.durationMinutes ? (
          <Typography.Text type="secondary">{t('courseEditor.durationMinutes', { count: lesson.durationMinutes })}</Typography.Text>
        ) : null}
      </Space>
      {lesson.content && (
        <div style={{ marginBottom: 16 }}>
          <ReactMarkdown>{lesson.content}</ReactMarkdown>
        </div>
      )}
      {lesson.videoUrl && (
        <Typography.Paragraph>
          <PlayCircleOutlined /> <a href={lesson.videoUrl} target="_blank" rel="noreferrer">
            {t('coursePreview.watchVideo')}
          </a>
        </Typography.Paragraph>
      )}
      {lesson.externalUrl && (
        <Typography.Paragraph>
          <a href={lesson.externalUrl} target="_blank" rel="noreferrer">
            {t('coursePreview.joinLink')}
          </a>
        </Typography.Paragraph>
      )}
      {lesson.scheduledAt && (
        <Typography.Paragraph type="secondary">
          {t('coursePreview.scheduledAt')}: {new Date(lesson.scheduledAt).toLocaleString('ru-RU')}
        </Typography.Paragraph>
      )}
      {!!lesson.attachments?.length && (
        <List
          size="small"
          bordered
          header={<Typography.Text strong>{t('coursePreview.attachmentsTitle')}</Typography.Text>}
          dataSource={lesson.attachments}
          renderItem={(attachment) => (
            <List.Item
              actions={[
                <a
                  key="download"
                  onClick={() => downloadViaApi(attachmentsApi.downloadPath(attachment.id), attachment.fileName)}
                >
                  {t('coursePreview.download')}
                </a>,
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined />}
                title={attachment.fileName}
                description={formatSize(attachment.size)}
              />
            </List.Item>
          )}
        />
      )}
      {!lesson.content && !lesson.videoUrl && !lesson.externalUrl && !lesson.attachments?.length && (
        <Typography.Text type="secondary">{t('coursePreview.noContent')}</Typography.Text>
      )}
      {footer}
    </div>
  );
}
