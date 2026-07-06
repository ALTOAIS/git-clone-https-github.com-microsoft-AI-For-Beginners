import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Form, InputNumber, Modal, Progress, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import type { MyCourseAssignment } from '../../types';
import {
  ALL_COURSE_ASSIGNMENT_STATUSES,
  COURSE_ASSIGNMENT_STATUS_COLORS,
  courseAssignmentStatusLabel,
  isAssignmentOverdue,
} from '../../utils/academyDisplay';
import { AcademySubNav } from './AcademySubNav';

export function MyAcademyPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MyCourseAssignment | null>(null);
  const [form] = Form.useForm();

  const { data, isFetching } = useQuery({
    queryKey: ['my-course-assignments'],
    queryFn: () => academyApi.myAssignments().then((r) => r.data),
  });

  const openEdit = (assignment: MyCourseAssignment) => {
    setEditing(assignment);
    form.setFieldsValue({ status: assignment.status, progressPercent: assignment.progressPercent });
  };

  const handleSave = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    await academyApi.updateAssignment(editing.course.id, editing.id, values);
    message.success(t('myAcademy.updated'));
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['my-course-assignments'] });
  };

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
            title: t('myAcademy.columns.progress'),
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
            width: 120,
            render: (_: unknown, record: MyCourseAssignment) => <a onClick={() => openEdit(record)}>{t('myAcademy.updateLink')}</a>,
          },
        ]}
      />

      <Modal
        title={t('myAcademy.modalTitle')}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSave}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="status" label={t('myAcademy.form.statusLabel')} rules={[{ required: true }]}>
            <Select options={ALL_COURSE_ASSIGNMENT_STATUSES.map((v) => ({ value: v, label: courseAssignmentStatusLabel(v) }))} />
          </Form.Item>
          <Form.Item
            name="progressPercent"
            label={
              <span>
                {t('myAcademy.form.progressLabel')}
                <InfoTooltip text={t('tooltips.academy.progress')} />
              </span>
            }
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
