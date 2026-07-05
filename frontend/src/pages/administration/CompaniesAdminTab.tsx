import { PlusOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Form, Input, Modal, Popconfirm, Table, Tag } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { companiesApi } from '../../api/endpoints';
import { InfoTooltip } from '../../components/InfoTooltip';
import { useCompanies } from '../../hooks/useReferenceData';
import type { Company } from '../../types';

export function CompaniesAdminTab() {
  const { t } = useTranslation();
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
      message.success(t('companiesAdmin.updated'));
    } else {
      await companiesApi.create(values);
      message.success(t('companiesAdmin.created'));
    }
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  const handleDeactivate = async (id: string) => {
    await companiesApi.remove(id);
    message.success(t('companiesAdmin.deactivated'));
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openCreate}>
        {t('companiesAdmin.newButton')}
      </Button>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: t('companiesAdmin.columns.name'), dataIndex: 'name' },
          { title: t('companiesAdmin.columns.description'), dataIndex: 'description' },
          {
            title: (
              <span>
                {t('companiesAdmin.columns.active')}
                <InfoTooltip text={t('tooltips.administration.activeToggle')} />
              </span>
            ),
            dataIndex: 'isActive',
            width: 100,
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('common.active') : t('common.inactive')}</Tag>,
          },
          {
            title: t('companiesAdmin.columns.actions'),
            width: 140,
            render: (_: unknown, record: Company) => (
              <>
                <a onClick={() => openEdit(record)}>{t('companiesAdmin.editLink')}</a>{' '}
                {record.isActive && (
                  <Popconfirm title={t('companiesAdmin.deactivateConfirm')} onConfirm={() => handleDeactivate(record.id)}>
                    <a>{t('companiesAdmin.deactivateLink')}</a>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? t('companiesAdmin.modalTitleEdit') : t('companiesAdmin.modalTitleNew')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('companiesAdmin.nameLabel')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('companiesAdmin.descriptionLabel')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
