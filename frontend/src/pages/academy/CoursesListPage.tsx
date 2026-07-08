import { PlusOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { academyApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { ALL_ROLES, roleLabel } from '../../auth/roles';
import { InfoTooltip } from '../../components/InfoTooltip';
import { ModuleHelpButton } from '../../components/ModuleHelpButton';
import { useCompanies, useDepartments, useUsersList } from '../../hooks/useReferenceData';
import type { CourseListItem, CourseStatus } from '../../types';
import { ALL_COURSE_STATUSES, COURSE_STATUS_COLORS, courseStatusLabel } from '../../utils/academyDisplay';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER', 'COMPLIANCE_OFFICER'];

export function CoursesListPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CourseStatus | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<CourseListItem | null>(null);
  const [createForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    if (searchParams.get('create') === '1' && canManage) {
      setCreateOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('create');
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canManage]);

  const { data: users } = useUsersList();
  const { data: departments } = useDepartments();
  const { data: companies } = useCompanies();

  const { data, isFetching } = useQuery({
    queryKey: ['courses', { page, status }],
    queryFn: () => academyApi.list({ page, pageSize: 20, status }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    const { data: created } = await academyApi.create(values);
    setCreateOpen(false);
    createForm.resetFields();
    queryClient.invalidateQueries({ queryKey: ['courses'] });
    navigate(`/academy/courses/${created.id}`);
  };

  const handleDelete = async (id: string) => {
    await academyApi.remove(id);
    message.success(t('coursesPage.deleted'));
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const handleAssign = async () => {
    if (!assignFor) return;
    const values = await assignForm.validateFields();
    const hasTarget =
      values.userIds?.length || values.departmentIds?.length || values.roles?.length || values.companyIds?.length;
    if (!hasTarget) {
      message.error(t('coursesPage.assignForm.atLeastOneTargetRequired'));
      return;
    }
    await academyApi.assign(assignFor.id, {
      userIds: values.userIds,
      departmentIds: values.departmentIds,
      roles: values.roles,
      companyIds: values.companyIds,
      startDate: values.startDate?.toISOString(),
      dueDate: values.dueDate?.toISOString(),
    });
    message.success(t('coursesPage.assigned'));
    setAssignFor(null);
    assignForm.resetFields();
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('coursesPage.title')}
          <InfoTooltip text={t('tooltips.academy.courseConstructor')} />
        </Typography.Title>
        <Space>
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              {t('coursesPage.createButton')}
            </Button>
          )}
          <ModuleHelpButton moduleKey="academy" />
        </Space>
      </Space>
      <Typography.Paragraph type="secondary">{t('coursesPage.description')}</Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder={t('coursesPage.statusPlaceholder')}
          style={{ width: 200 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={ALL_COURSE_STATUSES.map((value) => ({ value, label: courseStatusLabel(value) }))}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          {
            title: t('coursesPage.columns.title'),
            dataIndex: 'title',
            render: (title: string, record: CourseListItem) => (
              <a onClick={() => navigate(`/academy/courses/${record.id}`)}>{title}</a>
            ),
          },
          {
            title: t('coursesPage.columns.status'),
            dataIndex: 'status',
            width: 140,
            render: (v: CourseStatus) => <Tag color={COURSE_STATUS_COLORS[v]}>{courseStatusLabel(v)}</Tag>,
          },
          {
            title: t('coursesPage.columns.mandatory'),
            dataIndex: 'isMandatory',
            width: 120,
            render: (v: boolean) => (v ? <Tag color="red">{t('coursesPage.mandatoryYes')}</Tag> : t('coursesPage.mandatoryNo')),
          },
          { title: t('coursesPage.columns.modules'), dataIndex: ['_count', 'modules'], width: 100 },
          { title: t('coursesPage.columns.assignments'), dataIndex: ['_count', 'assignments'], width: 120 },
          { title: t('coursesPage.columns.createdBy'), dataIndex: ['createdBy', 'fullName'], width: 180 },
          {
            title: t('coursesPage.columns.actions'),
            width: 200,
            render: (_: unknown, record: CourseListItem) =>
              canManage ? (
                <Space>
                  <a onClick={() => setAssignFor(record)}>
                    <UsergroupAddOutlined /> {t('coursesPage.assignLink')}
                  </a>
                  <Popconfirm title={t('coursesPage.deleteConfirm')} onConfirm={() => handleDelete(record.id)}>
                    <a>{t('coursesPage.deleteLink')}</a>
                  </Popconfirm>
                </Space>
              ) : null,
          },
        ]}
      />

      <Modal
        title={t('coursesPage.createModalTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        width={640}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" initialValues={{ status: 'DRAFT', isMandatory: false }}>
          <Form.Item
            name="title"
            label={t('coursesPage.form.titleLabel')}
            rules={[{ required: true, message: t('coursesPage.form.titleRequired') }]}
          >
            <Input placeholder={t('coursesPage.form.titlePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('coursesPage.form.descriptionLabel')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label={t('coursesPage.form.statusLabel')}>
            <Select options={ALL_COURSE_STATUSES.map((value) => ({ value, label: courseStatusLabel(value) }))} />
          </Form.Item>
          <Form.Item
            name="isMandatory"
            label={
              <span>
                {t('coursesPage.form.mandatoryLabel')}
                <InfoTooltip text={t('tooltips.academy.mandatory')} />
              </span>
            }
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="applicableRoles"
            label={
              <span>
                {t('coursesPage.form.applicableRolesLabel')}
                <InfoTooltip text={t('tooltips.academy.applicableRoles')} />
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('coursesPage.form.applicableRolesPlaceholder')}
              options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
            />
          </Form.Item>
          <Form.Item
            name="applicableDepartmentIds"
            label={
              <span>
                {t('coursesPage.form.applicableDepartmentsLabel')}
                <InfoTooltip text={t('tooltips.academy.applicableDepartments')} />
              </span>
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t('coursesPage.form.applicableDepartmentsPlaceholder')}
              options={departments?.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('coursesPage.assignModalTitle', { title: assignFor?.title })}
        open={!!assignFor}
        onCancel={() => setAssignFor(null)}
        onOk={handleAssign}
        destroyOnHidden
      >
        <Form form={assignForm} layout="vertical">
          <Typography.Paragraph type="secondary">{t('coursesPage.assignForm.hint')}</Typography.Paragraph>
          <Form.Item name="userIds" label={t('coursesPage.assignForm.usersLabel')}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('coursesPage.assignForm.usersPlaceholder')}
              options={users?.items.map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="departmentIds" label={t('coursesPage.assignForm.departmentsLabel')}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('coursesPage.assignForm.departmentsPlaceholder')}
              options={departments?.map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="roles" label={t('coursesPage.assignForm.rolesLabel')}>
            <Select
              mode="multiple"
              allowClear
              placeholder={t('coursesPage.assignForm.rolesPlaceholder')}
              options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
            />
          </Form.Item>
          <Form.Item name="companyIds" label={t('coursesPage.assignForm.companiesLabel')}>
            <Select
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t('coursesPage.assignForm.companiesPlaceholder')}
              options={companies?.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="startDate" label={t('coursesPage.assignForm.startDateLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="dueDate" label={t('coursesPage.assignForm.dueDateLabel')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
