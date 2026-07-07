import { useQuery } from '@tanstack/react-query';
import { Progress, Space, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { MyCourseAssignment } from '../../types';
import {
  COURSE_ASSIGNMENT_STATUS_COLORS,
  courseAssignmentStatusLabel,
  isAssignmentOverdue,
} from '../../utils/academyDisplay';
import { AcademySubNav } from './AcademySubNav';

export function MyAcademyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['my-course-assignments'],
    queryFn: () => academyApi.myAssignments().then((r) => r.data),
  });

  return (
    <div>
      <AcademySubNav />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 0 }} align="center">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 0 }}>
          {t('myAcademy.title')}
          <InfoTooltip text={t('tooltips.academy.myAcademy')} />
        </Typography.Title>
        <ModuleHelpButton moduleKey="academy" />
      </Space>
      <Typography.Paragraph type="secondary">{t('myAcademy.description')}</Typography.Paragraph>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data}
        pagination={false}
        locale={{ emptyText: t('myAcademy.noAssignments') }}
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
    </div>
  );
}
