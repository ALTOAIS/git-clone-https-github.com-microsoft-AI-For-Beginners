import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Switch, Table, Tag } from 'antd';
import { useState } from 'react';
import { usersApi } from '../../api/endpoints';
import { ALL_ROLES, ROLE_LABELS } from '../../auth/roles';
import { useCompanies, useDepartments } from '../../hooks/useReferenceData';
import type { User } from '../../types';

export function UsersAdminTab() {
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
      message.success('User updated');
    } else {
      await usersApi.create(values);
      message.success('User created');
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const handleDeactivate = async (id: string) => {
    await usersApi.remove(id);
    message.success('User deactivated');
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        New User
      </Button>
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage }}
        columns={[
          { title: 'Name', dataIndex: 'fullName' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role', render: (v: User['role']) => <Tag>{ROLE_LABELS[v]}</Tag> },
          { title: 'Company', dataIndex: ['company', 'name'] },
          { title: 'Department', dataIndex: ['department', 'name'] },
          {
            title: 'Active',
            dataIndex: 'isActive',
            width: 90,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
          },
          {
            title: 'Actions',
            width: 160,
            render: (_: unknown, record: User) => (
              <>
                <a onClick={() => openEdit(record)}>Edit</a>{' '}
                {record.isActive && (
                  <Popconfirm title="Deactivate this user?" onConfirm={() => handleDeactivate(record.id)}>
                    <a>Deactivate</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal title={editing ? 'Edit User' : 'New User'} open={open} onCancel={() => setOpen(false)} onOk={handleSave}>
        <Form form={form} layout="vertical">
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label="Temporary Password" rules={[{ required: true, min: 8 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))} />
          </Form.Item>
          <Form.Item name="title" label="Job Title">
            <Input />
          </Form.Item>
          <Form.Item name="companyId" label="Company">
            <Select
              allowClear
              options={companies?.map((c) => ({ value: c.id, label: c.name }))}
              onChange={() => form.setFieldValue('departmentId', undefined)}
            />
          </Form.Item>
          <Form.Item name="departmentId" label="Department">
            <Select allowClear options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
