import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { departmentsApi } from '../../api/endpoints';
import { useCompanies } from '../../hooks/useReferenceData';
import type { Department } from '../../types';

export function DepartmentsAdminTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: companies } = useCompanies();
  const { data, isLoading } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    form.setFieldsValue(dept);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await departmentsApi.update(editing.id, values);
      message.success('Department updated');
    } else {
      await departmentsApi.create(values);
      message.success('Department created');
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleDeactivate = async (id: string) => {
    await departmentsApi.remove(id);
    message.success('Department deactivated');
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        New Department
      </Button>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Company', dataIndex: ['company', 'name'] },
          {
            title: 'Active',
            dataIndex: 'isActive',
            width: 100,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
          },
          {
            title: 'Actions',
            width: 140,
            render: (_: unknown, record: Department) => (
              <>
                <a onClick={() => openEdit(record)}>Edit</a>{' '}
                {record.isActive && (
                  <Popconfirm title="Deactivate this department?" onConfirm={() => handleDeactivate(record.id)}>
                    <a>Deactivate</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit Department' : 'New Department'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="companyId" label="Company" rules={[{ required: true }]}>
            <Select options={companies?.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
