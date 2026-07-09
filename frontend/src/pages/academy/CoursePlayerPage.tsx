import {
  CheckCircleFilled,
  ClockCircleOutlined,
  FileDoneOutlined,
  LeftOutlined,
  PlayCircleFilled,
  RightOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Menu, Progress, Result, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { lessonContentTypeLabel } from '../../utils/academyDisplay';
import { LessonContentView } from './LessonContentView';
import { LessonQuizPlayer } from './LessonQuizPlayer';

const FINAL_TEST_KEY = '__final_test__';

export function CoursePlayerPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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
    if (!selectedKey && flatLessons.length > 0) {
      const firstIncomplete = flatLessons.find((l) => !l.completed);
      setSelectedKey((firstIncomplete ?? flatLessons[0]).id);
    }
  }, [flatLessons, selectedKey]);

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

  const currentIndex = flatLessons.findIndex((l) => l.id === selectedKey);
  const currentLesson = currentIndex >= 0 ? flatLessons[currentIndex] : undefined;
  const showingFinalTest = selectedKey === FINAL_TEST_KEY;
  const allLessonsDone = flatLessons.length > 0 && flatLessons.every((l) => l.completed);
  const fullyCompleted = data.assignment.status === 'COMPLETED';

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

  const lessonStatusIcon = (lesson: (typeof flatLessons)[number]) => {
    if (lesson.completed) return <CheckCircleFilled style={{ color: '#52c41a' }} />;
    if (lesson.id === selectedKey) return <PlayCircleFilled style={{ color: '#1677ff' }} />;
    return <ClockCircleOutlined style={{ color: '#bfbfbf' }} />;
  };

  const lessonStatusLabel = (lesson: (typeof flatLessons)[number]) => {
    if (lesson.completed) return t('coursePlayer.statusCompleted');
    if (lesson.id === selectedKey) return t('coursePlayer.statusInProgress');
    return t('coursePlayer.statusNotStarted');
  };

  const menuItems = [
    ...data.modules.map((m) => ({
      key: m.id,
      label: `${m.order}. ${m.title}`,
      type: 'group' as const,
      children: [...m.lessons]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({
          key: l.id,
          label: (
            <Space title={lessonStatusLabel(l)}>
              {lessonStatusIcon(l)}
              {l.title}
            </Space>
          ),
        })),
    })),
    ...(data.test
      ? [
          {
            key: 'final-test-group',
            label: t('coursePlayer.finalTestGroup'),
            type: 'group' as const,
            children: [
              {
                key: FINAL_TEST_KEY,
                label: (
                  <Space>
                    {data.test.passed ? (
                      <CheckCircleFilled style={{ color: '#52c41a' }} />
                    ) : (
                      <FileDoneOutlined style={{ color: allLessonsDone ? '#1677ff' : '#bfbfbf' }} />
                    )}
                    {data.test.title}
                  </Space>
                ),
              },
            ],
          },
        ]
      : []),
  ];

  const currentModule = currentLesson
    ? data.modules.find((m) => m.lessons.some((l) => l.id === currentLesson.id))
    : undefined;

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
        <Col xs={24} md={7}>
          <Card size="small" title={t('coursePlayer.sidebarTitle')}>
            <Menu
              mode="inline"
              selectedKeys={selectedKey ? [selectedKey] : []}
              items={menuItems}
              onClick={({ key }) => setSelectedKey(key)}
            />
          </Card>
        </Col>
        <Col xs={24} md={17}>
          {showingFinalTest && data.test ? (
            <Card title={data.test.title}>
              {data.test.passed ? (
                <Result status="success" title={t('coursePlayer.testPassedTitle')} />
              ) : allLessonsDone ? (
                <Result
                  icon={<FileDoneOutlined />}
                  title={t('coursePlayer.testReadyTitle')}
                  subTitle={t('coursePlayer.testReadyDescription')}
                  extra={
                    <Button type="primary" onClick={() => navigate(`/academy/take-test/${id}`)}>
                      {t('coursePlayer.takeTestButton')}
                    </Button>
                  }
                />
              ) : (
                <Result
                  icon={<ClockCircleOutlined />}
                  title={t('coursePlayer.testLockedTitle')}
                  subTitle={t('coursePlayer.testLockedDescription')}
                />
              )}
            </Card>
          ) : currentLesson ? (
            <Card
              title={
                <div style={{ padding: '8px 0' }}>
                  <Typography.Text strong style={{ fontSize: 16, display: 'block' }}>
                    {currentLesson.title}
                  </Typography.Text>
                  <Space size={8} style={{ marginTop: 4 }} wrap>
                    {currentModule && (
                      <Typography.Text type="secondary" style={{ fontWeight: 'normal', fontSize: 12 }}>
                        {currentModule.order}. {currentModule.title}
                      </Typography.Text>
                    )}
                    <Tag style={{ fontWeight: 'normal' }}>{lessonContentTypeLabel(currentLesson.contentType)}</Tag>
                    {currentLesson.durationMinutes ? (
                      <Typography.Text type="secondary" style={{ fontWeight: 'normal', fontSize: 12 }}>
                        <ClockCircleOutlined />{' '}
                        {t('courseEditor.durationMinutes', { count: currentLesson.durationMinutes })}
                      </Typography.Text>
                    ) : null}
                    <Tag color={currentLesson.completed ? 'green' : 'blue'} style={{ fontWeight: 'normal' }}>
                      {lessonStatusLabel(currentLesson)}
                    </Tag>
                  </Space>
                </div>
              }
              extra={
                <Space>
                  <Button
                    icon={<LeftOutlined />}
                    disabled={currentIndex <= 0}
                    onClick={() => setSelectedKey(flatLessons[currentIndex - 1].id)}
                  >
                    {t('coursePlayer.prevButton')}
                  </Button>
                  <Button
                    icon={<RightOutlined />}
                    disabled={currentIndex >= flatLessons.length - 1 && !data.test}
                    onClick={() =>
                      currentIndex >= flatLessons.length - 1
                        ? setSelectedKey(FINAL_TEST_KEY)
                        : setSelectedKey(flatLessons[currentIndex + 1].id)
                    }
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
