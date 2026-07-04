import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Switch, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../../api/endpoints';
import { ALL_ROLES, roleLabel } from '../../auth/roles';
import { useCompanies, useDepartments } from '../../hooks/useReferenceData';
import type { User } from '../../types';

export function UsersAdminTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();
  const companyId = Form.useWatch('companyId', form);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => usersApi.list({ page, pageSize: 20 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
  const { data: companies } = useCompanies();
  const { data: departments } = useDepartments(companyId);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    form.setFieldsValue(user);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await usersApi.update(editing.id, values);
      message.success(t('usersAdmin.updated'));
    } else {
      await usersApi.create(values);
      message.success(t('usersAdmin.created'));
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const handleDeactivate = async (id: string) => {
    await usersApi.remove(id);
    message.success(t('usersAdmin.deactivated'));
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        {t('usersAdmin.newButton')}
      </Button>
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: t('usersAdmin.columns.name'), dataIndex: 'fullName' },
          { title: t('usersAdmin.columns.email'), dataIndex: 'email' },
          { title: t('usersAdmin.columns.role'), dataIndex: 'role', render: (v: User['role']) => <Tag>{roleLabel(v)}</Tag> },
          { title: t('usersAdmin.columns.company'), dataIndex: ['company', 'name'] },
          { title: t('usersAdmin.columns.department'), dataIndex: ['department', 'name'] },
          {
            title: t('usersAdmin.columns.active'),
            dataIndex: 'isActive',
            width: 90,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('common.active') : t('common.inactive')}</Tag>,
          },
          {
            title: t('usersAdmin.columns.actions'),
            width: 160,
            render: (_: unknown, record: User) => (
              <>
                <a onClick={() => openEdit(record)}>{t('usersAdmin.editLink')}</a>{' '}
                {record.isActive && (
                  <Popconfirm title={t('usersAdmin.deactivateConfirm')} onConfirm={() => handleDeactivate(record.id)}>
                    <a>{t('usersAdmin.deactivateLink')}</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('usersAdmin.modalTitleEdit') : t('usersAdmin.modalTitleNew')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="fullName" label={t('usersAdmin.fullNameLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t('usersAdmin.emailLabel')} rules={[{ required: true, type: 'email' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label={t('usersAdmin.passwordLabel')} rules={[{ required: true, min: 8 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label={t('usersAdmin.roleLabel')} rules={[{ required: true }]}>
            <Select options={ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))} />
          </Form.Item>
          <Form.Item name="title" label={t('usersAdmin.jobTitleLabel')}>
            <Input />
          </Form.Item>
          <Form.Item name="companyId" label={t('usersAdmin.companyLabel')}>
            <Select
              allowClear
              options={companies?.map((c) => ({ value: c.id, label: c.name }))}
              onChange={() => form.setFieldValue('departmentId', undefined)}
            />
          </Form.Item>
          <Form.Item name="departmentId" label={t('usersAdmin.departmentLabel')}>
            <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label={t('usersAdmin.activeLabel')} valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
