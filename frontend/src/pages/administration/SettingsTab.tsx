import { App, Button, Card, Descriptions, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { roleLabel } from '../../auth/roles';

export function SettingsTab() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      message.success(t('settings.passwordChanged'));
      form.resetFields();
    } catch {
      message.error(t('settings.passwordChangeFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card title={t('settings.accountTitle')} style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label={t('settings.nameLabel')}>{user?.fullName}</Descriptions.Item>
          <Descriptions.Item label={t('settings.emailLabel')}>{user?.email}</Descriptions.Item>
          <Descriptions.Item label={t('settings.roleLabel')}>{user ? roleLabel(user.role) : ''}</Descriptions.Item>
          <Descriptions.Item label={t('settings.jobTitleLabel')}>{user?.title ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('settings.changePasswordTitle')} style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" style={{ maxWidth: 360 }}>
          <Form.Item name="currentPassword" label={t('settings.currentPasswordLabel')} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label={t('settings.newPasswordLabel')} rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" onClick={handleChangePassword} loading={saving}>
            {t('settings.updateButton')}
          </Button>
        </Form>
      </Card>

      <Card title={t('settings.systemTitle')}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t('settings.systemDescription')}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
