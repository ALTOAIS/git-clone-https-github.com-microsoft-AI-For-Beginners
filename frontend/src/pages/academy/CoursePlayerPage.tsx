import { CheckCircleFilled, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Menu, Progress, Result, Row, Skeleton, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { LessonContentView } from './LessonContentView';
import { LessonQuizPlayer } from './LessonQuizPlayer';

export function CoursePlayerPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const queryKey = ['course-player', id];
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => academyApi.getPlayer(id!).then((r) => r.data),
    enabled: !!id,
  });

  const flatLessons = useMemo(
    () =>
      data?.modules
        .flatMap((m) => [...m.lessons].sort((a, b) => a.order - b.order))
        .sort((a, b) => a.order - b.order) ?? [],
    [data],
  );

  useEffect(() => {
    if (!selectedLessonId && flatLessons.length > 0) {
      setSelectedLessonId(flatLessons[0].id);
    }
  }, [flatLessons, selectedLessonId]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

  if (isError || !data) {
    return (
      <Result
        status="warning"
        title={t('coursePlayer.notAssignedTitle')}
        subTitle={t('coursePlayer.notAssignedDescription')}
        extra={
          <Button type="primary" onClick={() => navigate('/academy/my')}>
            {t('coursePlayer.backButton')}
          </Button>
        }
      />
    );
  }

  const currentIndex = flatLessons.findIndex((l) => l.id === selectedLessonId);
  const currentLesson = currentIndex >= 0 ? flatLessons[currentIndex] : undefined;
  const allLessonsDone = flatLessons.length > 0 && flatLessons.every((l) => l.completed);
  const fullyCompleted = data.assignment.status === 'COMPLETED';
  const showTestCta = allLessonsDone && data.test && !data.test.passed;

  const handleMarkComplete = async () => {
    if (!currentLesson || !id) return;
    setCompleting(true);
    try {
      await academyApi.completeLesson(id, currentLesson.id);
      message.success(t('coursePlayer.lessonMarkedComplete'));
      queryClient.invalidateQueries({ queryKey });
    } catch {
      message.error(t('coursePlayer.markCompleteFailed'));
    } finally {
      setCompleting(false);
    }
  };

  const menuItems = data.modules.map((m) => ({
    key: m.id,
    label: `${m.order}. ${m.title}`,
    type: 'group' as const,
    children: [...m.lessons]
      .sort((a, b) => a.order - b.order)
      .map((l) => ({
        key: l.id,
        label: (
          <Space>
            {l.completed && <CheckCircleFilled style={{ color: '#52c41a' }} />}
            {l.title}
          </Space>
        ),
      })),
  }));

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {data.course.title}
        </Typography.Title>
        <Button onClick={() => navigate('/academy/my')}>{t('coursePlayer.backButton')}</Button>
      </Space>
      <Progress percent={data.assignment.progressPercent} style={{ margin: '8px 0 16px' }} />

      {fullyCompleted && (
        <Result
          status="success"
          title={t('coursePlayer.completedTitle')}
          subTitle={
            data.assignment.completedAt
              ? `${t('coursePlayer.completedOn')}: ${new Date(data.assignment.completedAt).toLocaleDateString('ru-RU')}`
              : undefined
          }
          style={{ marginBottom: 16, padding: '24px 0' }}
        />
      )}

      <Row gutter={16}>
        <Col span={7}>
          <Card size="small" title={t('coursePlayer.sidebarTitle')}>
            <Menu
              mode="inline"
              selectedKeys={selectedLessonId ? [selectedLessonId] : []}
              items={menuItems}
              onClick={({ key }) => setSelectedLessonId(key)}
            />
            {showTestCta && (
              <Button type="primary" block style={{ marginTop: 12 }} onClick={() => navigate(`/academy/take-test/${id}`)}>
                {t('coursePlayer.takeTestButton')}
              </Button>
            )}
          </Card>
        </Col>
        <Col span={17}>
          {currentLesson ? (
            <Card
              title={currentLesson.title}
              extra={
                <Space>
                  <Button
                    icon={<LeftOutlined />}
                    disabled={currentIndex <= 0}
                    onClick={() => setSelectedLessonId(flatLessons[currentIndex - 1].id)}
                  >
                    {t('coursePlayer.prevButton')}
                  </Button>
                  <Button
                    icon={<RightOutlined />}
                    disabled={currentIndex >= flatLessons.length - 1}
                    onClick={() => setSelectedLessonId(flatLessons[currentIndex + 1].id)}
                  >
                    {t('coursePlayer.nextButton')}
                  </Button>
                </Space>
              }
            >
              {currentLesson.contentType === 'QUIZ' ? (
                <LessonQuizPlayer
                  courseId={id!}
                  lesson={currentLesson}
                  onSubmitted={() => queryClient.invalidateQueries({ queryKey })}
                />
              ) : (
                <LessonContentView
                  lesson={currentLesson}
                  footer={
                    <div style={{ marginTop: 16 }}>
                      {currentLesson.completed ? (
                        <Typography.Text type="success">
                          <CheckCircleFilled /> {t('coursePlayer.lessonCompleted')}
                        </Typography.Text>
                      ) : (
                        <Button type="primary" loading={completing} onClick={handleMarkComplete}>
                          {t('coursePlayer.markCompleteButton')}
                        </Button>
                      )}
                    </div>
                  }
                />
              )}
            </Card>
          ) : (
            <Typography.Text type="secondary">{t('coursePlayer.noLessonsYet')}</Typography.Text>
          )}
        </Col>
      </Row>
    </div>
  );
}
