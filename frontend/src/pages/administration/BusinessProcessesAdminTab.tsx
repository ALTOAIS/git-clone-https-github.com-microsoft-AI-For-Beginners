import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { businessProcessesApi } from '../../api/endpoints';
import { useDepartments } from '../../hooks/useReferenceData';
import type { BusinessProcess } from '../../types';

export function BusinessProcessesAdminTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { data: departments } = useDepartments();
  const { data, isLoading } = useQuery({
    queryKey: ['business-processes', 'all'],
    queryFn: () => businessProcessesApi.list().then((r) => r.data),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessProcess | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (proc: BusinessProcess) => {
    setEditing(proc);
    form.setFieldsValue(proc);
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await businessProcessesApi.update(editing.id, values);
      message.success(t('businessProcessesAdmin.updated'));
    } else {
      await businessProcessesApi.create(values);
      message.success(t('businessProcessesAdmin.created'));
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['business-processes'] });
  };

  const handleDeactivate = async (id: string) => {
    await businessProcessesApi.remove(id);
    message.success(t('businessProcessesAdmin.deactivated'));
    queryClient.invalidateQueries({ queryKey: ['business-processes'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        {t('businessProcessesAdmin.newButton')}
      </Button>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: t('businessProcessesAdmin.columns.name'), dataIndex: 'name' },
          { title: t('businessProcessesAdmin.columns.department'), dataIndex: ['department', 'name'] },
          {
            title: t('businessProcessesAdmin.columns.active'),
            dataIndex: 'isActive',
            width: 100,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('common.active') : t('common.inactive')}</Tag>,
          },
          {
            title: t('businessProcessesAdmin.columns.actions'),
            width: 140,
            render: (_: unknown, record: BusinessProcess) => (
              <>
                <a onClick={() => openEdit(record)}>{t('businessProcessesAdmin.editLink')}</a>{' '}
                {record.isActive && (
                  <Popconfirm title={t('businessProcessesAdmin.deactivateConfirm')} onConfirm={() => handleDeactivate(record.id)}>
                    <a>{t('businessProcessesAdmin.deactivateLink')}</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('businessProcessesAdmin.modalTitleEdit') : t('businessProcessesAdmin.modalTitleNew')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('businessProcessesAdmin.nameLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="departmentId" label={t('businessProcessesAdmin.departmentLabel')} rules={[{ required: true }]}>
            <Select options={departments?.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
