import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { departmentsApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { useCompanies } from '../../hooks/useReferenceData';
import type { Department } from '../../types';

export function DepartmentsAdminTab() {
  const { t } = useTranslation();
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
      message.success(t('departmentsAdmin.updated'));
    } else {
      await departmentsApi.create(values);
      message.success(t('departmentsAdmin.created'));
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  const handleDeactivate = async (id: string) => {
    await departmentsApi.remove(id);
    message.success(t('departmentsAdmin.deactivated'));
    queryClient.invalidateQueries({ queryKey: ['departments'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        {t('departmentsAdmin.newButton')}
      </Button>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: t('departmentsAdmin.columns.name'), dataIndex: 'name' },
          { title: t('departmentsAdmin.columns.company'), dataIndex: ['company', 'name'] },
          {
            title: (
              <span>
                {t('departmentsAdmin.columns.active')}
                <InfoTooltip text={t('tooltips.administration.activeToggle')} />
              </span>
            ),
            dataIndex: 'isActive',
            width: 100,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('common.active') : t('common.inactive')}</Tag>,
          },
          {
            title: t('departmentsAdmin.columns.actions'),
            width: 140,
            render: (_: unknown, record: Department) => (
              <>
                <a onClick={() => openEdit(record)}>{t('departmentsAdmin.editLink')}</a>{' '}
                {record.isActive && (
                  <Popconfirm title={t('departmentsAdmin.deactivateConfirm')} onConfirm={() => handleDeactivate(record.id)}>
                    <a>{t('departmentsAdmin.deactivateLink')}</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('departmentsAdmin.modalTitleEdit') : t('departmentsAdmin.modalTitleNew')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('departmentsAdmin.nameLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="companyId" label={t('departmentsAdmin.companyLabel')} rules={[{ required: true }]}>
            <Select options={companies?.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
