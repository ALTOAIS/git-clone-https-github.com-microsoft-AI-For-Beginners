import { FileOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Collapse, List, Skeleton, Space, Tag, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi, attachmentsApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import type { CourseLesson } from '../../types';
import { downloadViaApi } from '../../utils/download';
import { lessonContentTypeLabel } from '../../utils/academyDisplay';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LessonPreview({ lesson }: { lesson: CourseLesson }) {
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
    </div>
  );
}

export function CoursePreviewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-preview', id],
    queryFn: () => academyApi.preview(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading || !course) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('coursePreview.title')}
          <InfoTooltip text={t('coursePreview.subtitle')} />
        </Typography.Title>
        <Button onClick={() => navigate(`/academy/courses/${id}`)}>{t('coursePreview.backButton')}</Button>
      </Space>

      <Alert type="info" showIcon message={t('coursePreview.previewModeNotice')} style={{ margin: '16px 0' }} />

      <Card title={course.title}>
        {course.description && <Typography.Paragraph>{course.description}</Typography.Paragraph>}
        <Collapse
          items={[...course.modules]
            .sort((a, b) => a.order - b.order)
            .map((module) => ({
              key: module.id,
              label: `${module.order}. ${module.title}`,
              children: (
                <Collapse
                  items={[...module.lessons]
                    .sort((a, b) => a.order - b.order)
                    .map((lesson) => ({
                      key: lesson.id,
                      label: `${lesson.order}. ${lesson.title}`,
                      children: <LessonPreview lesson={lesson} />,
                    }))}
                />
              ),
            }))}
        />
        {course.modules.length === 0 && <Typography.Text type="secondary">{t('coursePreview.noModulesYet')}</Typography.Text>}
      </Card>
    </div>
  );
}
