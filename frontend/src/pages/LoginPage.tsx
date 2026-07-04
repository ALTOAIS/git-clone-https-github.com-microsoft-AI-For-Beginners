import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';

export function LoginPage() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f2444 0%, #16324f 55%, #0b3d3a 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyCertificateOutlined style={{ fontSize: 40, color: '#0f5fa8' }} />
          <Typography.Title level={4} style={{ marginTop: 12, marginBottom: 0 }}>
            {t('app.fullName')}
          </Typography.Title>
          <Typography.Text type="secondary">{t('app.shortName')}</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="secondary">{t('auth.signInSubtitle')}</Typography.Text>
          </div>
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label={t('auth.emailLabel')}
            name="email"
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailInvalid') },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder={t('auth.emailPlaceholder')} size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label={t('auth.passwordLabel')}
            name="password"
            rules={[{ required: true, message: t('auth.passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              {t('auth.signIn')}
            </Button>
          </Form.Item>
        </Form>

        <Typography.Paragraph type="secondary" style={{ marginTop: 20, fontSize: 12, textAlign: 'center' }}>
          {t('auth.demoAccounts')}
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
