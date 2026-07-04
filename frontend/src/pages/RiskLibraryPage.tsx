import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Modal, Select, Space, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';
import { categoriesApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import type { Category } from '../types';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER'];

function toTreeData(categories: Category[]): DataNode[] {
  return categories.map((c) => ({
    key: c.id,
    title: (
      <Space>
        <span>{c.name}</span>
        {!!c._count?.risks && <Tag color="blue">{c._count.risks} risks</Tag>}
      </Space>
    ),
    children: c.children ? toTreeData(c.children) : undefined,
  }));
}

function flatten(categories: Category[]): Category[] {
  return categories.flatMap((c) => [c, ...(c.children ? flatten(c.children) : [])]);
}

export function RiskLibraryPage() {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: tree, isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.tree().then((r) => r.data),
  });

  const flatCategories = useMemo(() => flatten(tree ?? []), [tree]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    await categoriesApi.create(values);
    message.success('Category added to Risk Library');
    setOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Risk Library
        </Typography.Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Add Category
          </Button>
        )}
      </Space>
      <Typography.Paragraph type="secondary">
        The Risk Library is the master catalog of compliance risk categories used to classify entries in the Risk
        Register.
      </Typography.Paragraph>

      <Card loading={isLoading}>
        <Tree treeData={toTreeData(tree ?? [])} defaultExpandAll showLine />
      </Card>

      <Modal title="Add Risk Category" open={open} onCancel={() => setOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="parentId" label="Parent Category">
            <Select allowClear options={flatCategories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
