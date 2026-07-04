import { App, Button, Card, Descriptions, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { authApi } from '../../api/endpoints';
import { useAuthStore } from '../../auth/authStore';
import { ROLE_LABELS } from '../../auth/roles';

export function SettingsTab() {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      message.success('Password changed');
      form.resetFields();
    } catch {
      message.error('Could not change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card title="Account" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Name">{user?.fullName}</Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Role">{user ? ROLE_LABELS[user.role] : ''}</Descriptions.Item>
          <Descriptions.Item label="Title">{user?.title ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Change Password" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" style={{ maxWidth: 360 }}>
          <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" onClick={handleChangePassword} loading={saving}>
            Update Password
          </Button>
        </Form>
      </Card>

      <Card title="System">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Compliance Risk Hub MVP · Session timeout enforced via JWT access token expiry with automatic refresh.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
