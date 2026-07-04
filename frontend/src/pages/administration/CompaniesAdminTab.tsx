import { PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Table, Tag } from 'antd';
import { useState } from 'react';
import { companiesApi } from '../../api/endpoints';
import { useCompanies } from '../../hooks/useReferenceData';
import type { Company } from '../../types';

export function CompaniesAdminTab() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCompanies();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    form.setFieldsValue(company);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await companiesApi.update(editing.id, values);
      message.success('Company updated');
    } else {
      await companiesApi.create(values);
      message.success('Company created');
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  const handleDeactivate = async (id: string) => {
    await companiesApi.remove(id);
    message.success('Company deactivated');
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        New Company
      </Button>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Description', dataIndex: 'description' },
          {
            title: 'Active',
            dataIndex: 'isActive',
            width: 100,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
          },
          {
            title: 'Actions',
            width: 140,
            render: (_: unknown, record: Company) => (
              <>
                <a onClick={() => openEdit(record)}>Edit</a>{' '}
                {record.isActive && (
                  <Popconfirm title="Deactivate this company?" onConfirm={() => handleDeactivate(record.id)}>
                    <a>Deactivate</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal title={editing ? 'Edit Company' : 'New Company'} open={open} onCancel={() => setOpen(false)} onOk={handleSave}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
