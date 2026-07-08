import {
  BookOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, List, Progress, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { academyApi, certificatesApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { MyCourseAssignment } from '../../types';
import {
  COURSE_ASSIGNMENT_STATUS_COLORS,
  courseAssignmentStatusLabel,
  isAssignmentOverdue,
} from '../../utils/academyDisplay';

export function MyAcademyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['my-course-assignments'],
    queryFn: () => academyApi.myAssignments().then((r) => r.data),
  });

  const { data: certificates } = useQuery({
    queryKey: ['certificates-my'],
    queryFn: () => certificatesApi.my().then((r) => r.data),
  });

  const { data: publishedCourses } = useQuery({
    queryKey: ['courses-published-for-recommendations'],
    queryFn: () => academyApi.list({ status: 'PUBLISHED', pageSize: 50 }).then((r) => r.data),
  });

  const assignments = data ?? [];
  const inProgress = assignments.filter((a) => a.status === 'IN_PROGRESS');
  const overdue = assignments.filter((a) => isAssignmentOverdue(a.status, a.dueDate));
  const assignedIds = new Set(assignments.map((a) => a.course.id));
  const recommended = useMemo(
    () => (publishedCourses?.items ?? []).filter((c) => !assignedIds.has(c.id)).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publishedCourses, assignments.length],
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('myAcademy.title')}
          <InfoTooltip text={t('tooltips.academy.myAcademy')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('myAcademy.description')}</Typography.Paragraph>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => inProgress[0] && navigate(`/academy/learn/${inProgress[0].course.id}`)}
          >
            <Statistic
              title={t('myAcademy.cards.continue')}
              value={inProgress.length}
              prefix={<PlayCircleOutlined style={{ color: '#0f5fa8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('myAcademy.cards.assigned')}
              value={assignments.length}
              prefix={<TeamOutlined style={{ color: '#13a8a8' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('myAcademy.cards.overdue')}
              value={overdue.length}
              valueStyle={{ color: overdue.length > 0 ? '#fa8c16' : undefined }}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/academy/certificates')}>
            <Statistic
              title={t('myAcademy.cards.certificates')}
              value={certificates?.length ?? 0}
              prefix={<SafetyCertificateOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={assignments}
        pagination={false}
        locale={{ emptyText: t('myAcademy.noAssignments') }}
        style={{ marginBottom: 24 }}
        columns={[
          {
            title: t('myAcademy.columns.course'),
            dataIndex: ['course', 'title'],
            render: (title: string, record: MyCourseAssignment) => (
              <Space>
                {title}
                {record.course.isMandatory && <Tag color="red">{t('myAcademy.mandatoryTag')}</Tag>}
              </Space>
            ),
          },
          {
            title: t('myAcademy.columns.status'),
            dataIndex: 'status',
            width: 160,
            render: (v: MyCourseAssignment['status'], record: MyCourseAssignment) => (
              <Space>
                <Tag color={COURSE_ASSIGNMENT_STATUS_COLORS[v]}>{courseAssignmentStatusLabel(v)}</Tag>
                {isAssignmentOverdue(record.status, record.dueDate) && <Tag color="volcano">{t('myAcademy.overdueTag')}</Tag>}
              </Space>
            ),
          },
          {
            title: (
              <span>
                {t('myAcademy.columns.progress')}
                <InfoTooltip text={t('tooltips.academy.progress')} />
              </span>
            ),
            dataIndex: 'progressPercent',
            width: 180,
            render: (v: number) => <Progress percent={v} size="small" />,
          },
          {
            title: t('myAcademy.columns.dueDate'),
            dataIndex: 'dueDate',
            width: 130,
            render: (v: string | null) => (v ? v.slice(0, 10) : '—'),
          },
          {
            title: t('myAcademy.columns.actions'),
            width: 220,
            render: (_: unknown, record: MyCourseAssignment) => (
              <Space>
                <a onClick={() => navigate(`/academy/learn/${record.course.id}`)}>{t('myAcademy.continueLink')}</a>
                <a onClick={() => navigate(`/academy/take-test/${record.course.id}`)}>{t('myAcademy.takeTestLink')}</a>
              </Space>
            ),
          },
        ]}
      />

      <Typography.Title level={4}>{t('myAcademy.recommendedTitle')}</Typography.Title>
      {recommended.length === 0 ? (
        <Empty description={t('myAcademy.noRecommendations')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={recommended}
          renderItem={(course) => (
            <List.Item
              actions={[<a key="preview" onClick={() => navigate(`/academy/courses/${course.id}/preview`)}>{t('myAcademy.previewLink')}</a>]}
            >
              <List.Item.Meta avatar={<BookOutlined />} title={course.title} />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
