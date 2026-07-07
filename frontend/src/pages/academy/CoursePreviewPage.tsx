import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Collapse, Skeleton, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { LessonContentView } from './LessonContentView';

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
                      children: <LessonContentView lesson={lesson} />,
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
