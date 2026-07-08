import {
  BellOutlined,
  LockOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Avatar, Badge, Button, Descriptions, Dropdown, Form, Input, Layout, Menu, Modal, Popover, Space, Tooltip, Typography, List, Empty } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authApi, notificationsApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { roleLabel } from '../auth/roles';
import type { AppNotification, Role } from '../types';
import { NAV_ITEMS, type NavItem } from './navConfig';

const { Header, Sider, Content } = Layout;

function filterByRole(items: NavItem[], role: Role | undefined): NavItem[] {
  return items.filter((item) => !item.roles || (role && item.roles.includes(role)));
}

function matchesLocation(item: NavItem, pathname: string, search: string): boolean {
  const [itemPath, itemQuery] = item.path.split('?');
  if (itemQuery) {
    return pathname === itemPath && search.replace(/^\?/, '') === itemQuery;
  }
  return pathname.startsWith(itemPath);
}

function toMenuItems(items: NavItem[], t: (key: string) => string): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    icon: <item.icon />,
    label: <Link to={item.path}>{t(item.labelKey)}</Link>,
  }));
}

export function MainLayout() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm] = Form.useForm();

  const visibleNavItems = useMemo(() => filterByRole(NAV_ITEMS, user?.role), [user]);

  const selectedKey = useMemo(() => {
    const match = visibleNavItems.find((item) => matchesLocation(item, location.pathname, location.search));
    return match?.key ?? 'dashboard';
  }, [location.pathname, location.search, visibleNavItems]);

  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      try {
        const { data } = await notificationsApi.list();
        if (!cancelled) setNotifications(data);
      } catch {
        // notifications are non-critical; ignore failures
      }
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields();
    setPasswordSaving(true);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      message.success(t('settings.passwordChanged'));
      passwordForm.resetFields();
      setPasswordOpen(false);
    } catch {
      message.error(t('settings.passwordChangeFailed'));
    } finally {
      setPasswordSaving(false);
    }
  };

  const notificationContent = (
    <div style={{ width: 340, maxHeight: 400, overflowY: 'auto' }}>
      {notifications.length === 0 ? (
        <Empty description={t('layout.noNotifications')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          dataSource={notifications.slice(0, 20)}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer', opacity: item.isRead ? 0.6 : 1 }}
              onClick={async () => {
                if (!item.isRead) {
                  await notificationsApi.markRead(item.id);
                  setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
                }
                if (item.link) navigate(item.link);
              }}
            >
              <List.Item.Meta title={item.title} description={item.message} />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark" width={230}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#fff',
            paddingLeft: 20,
            fontWeight: 600,
          }}
        >
          <SafetyCertificateOutlined style={{ fontSize: 20 }} />
          <span>CRH</span>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={toMenuItems(visibleNavItems, t)} />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Space size="large">
            <Popover content={notificationContent} title={t('layout.notifications')} trigger="click" placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Popover>
            {user?.role === 'ADMINISTRATOR' && (
              <Tooltip title={t('layout.systemSettings')}>
                <SettingOutlined
                  style={{ fontSize: 18, cursor: 'pointer' }}
                  onClick={() => navigate('/administration')}
                />
              </Tooltip>
            )}
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: t('layout.myProfile'), onClick: () => setProfileOpen(true) },
                  { key: 'password', icon: <LockOutlined />, label: t('layout.changePassword'), onClick: () => setPasswordOpen(true) },
                  { key: 'notifications', icon: <BellOutlined />, label: t('layout.notifications'), onClick: () => setNotifModalOpen(true) },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('layout.signOut'), onClick: handleLogout },
                ],
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <div style={{ lineHeight: 1.2 }}>
                  <div>{user?.fullName}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {user ? roleLabel(user.role) : ''}
                  </Typography.Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 20 }}>
          <Outlet />
        </Content>
      </Layout>

      <Modal title={t('layout.myProfile')} open={profileOpen} onCancel={() => setProfileOpen(false)} footer={null}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('settings.nameLabel')}>{user?.fullName}</Descriptions.Item>
          <Descriptions.Item label={t('settings.emailLabel')}>{user?.email}</Descriptions.Item>
          <Descriptions.Item label={t('settings.roleLabel')}>{user ? roleLabel(user.role) : ''}</Descriptions.Item>
          <Descriptions.Item label={t('settings.jobTitleLabel')}>{user?.title ?? '—'}</Descriptions.Item>
        </Descriptions>
      </Modal>

      <Modal
        title={t('layout.changePassword')}
        open={passwordOpen}
        onCancel={() => setPasswordOpen(false)}
        onOk={handleChangePassword}
        confirmLoading={passwordSaving}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item name="currentPassword" label={t('settings.currentPasswordLabel')} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label={t('settings.newPasswordLabel')} rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('layout.notifications')}
        open={notifModalOpen}
        onCancel={() => setNotifModalOpen(false)}
        footer={
          <Button onClick={() => setNotifModalOpen(false)}>{t('common.close')}</Button>
        }
      >
        {notificationContent}
      </Modal>
    </Layout>
  );
}
