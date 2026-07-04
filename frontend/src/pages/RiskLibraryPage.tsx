import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Modal, Select, Space, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categoriesApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import type { Category } from '../types';

const MANAGE_ROLES = ['ADMINISTRATOR', 'COMPLIANCE_MANAGER'];

function flatten(categories: Category[]): Category[] {
  return categories.flatMap((c) => [c, ...(c.children ? flatten(c.children) : [])]);
}

export function RiskLibraryPage() {
  const { t } = useTranslation();
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

  const toTreeData = (categories: Category[]): DataNode[] =>
    categories.map((c) => ({
      key: c.id,
      title: (
        <Space>
          <span>{c.name}</span>
          {!!c._count?.risks && (
            <Tag color="blue">
              {c._count.risks} {t('riskLibrary.risksSuffix')}
            </Tag>
          )}
        </Space>
      ),
      children: c.children ? toTreeData(c.children) : undefined,
    }));

  const flatCategories = useMemo(() => flatten(tree ?? []), [tree]);

  const handleCreate = async () => {
    const values = await form.validateFields();
    await categoriesApi.create(values);
    message.success(t('riskLibrary.added'));
    setOpen(false);
    form.resetFields();
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('riskLibrary.title')}
        </Typography.Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('riskLibrary.addCategoryButton')}
          </Button>
        )}
      </Space>
      <Typography.Paragraph type="secondary">{t('riskLibrary.description')}</Typography.Paragraph>

      <Card loading={isLoading}>
        <Tree treeData={toTreeData(tree ?? [])} defaultExpandAll showLine />
      </Card>

      <Modal title={t('riskLibrary.modalTitle')} open={open} onCancel={() => setOpen(false)} onOk={handleCreate}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('riskLibrary.nameLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('riskLibrary.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="parentId" label={t('riskLibrary.parentLabel')}>
            <Select allowClear options={flatCategories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
