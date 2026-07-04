import { BellOutlined, LogoutOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Dropdown, Layout, Menu, Popover, Space, Typography, List, Empty } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { ROLE_LABELS } from '../auth/roles';
import type { AppNotification } from '../types';
import { NAV_ITEMS } from './navConfig';

const { Header, Sider, Content } = Layout;

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
    [user],
  );

  const selectedKey = useMemo(() => {
    const match = visibleNavItems.find((item) => location.pathname.startsWith(item.path));
    return match?.key ?? 'dashboard';
  }, [location.pathname, visibleNavItems]);

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

  const notificationContent = (
    <div style={{ width: 340, maxHeight: 400, overflowY: 'auto' }}>
      {notifications.length === 0 ? (
        <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleNavItems.map((item) => ({
            key: item.key,
            icon: <item.icon />,
            label: <Link to={item.path}>{item.label}</Link>,
          }))}
        />
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
            <Popover content={notificationContent} title="Notifications" trigger="click" placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Popover>
            <Dropdown
              menu={{
                items: [
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: handleLogout },
                ],
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <div style={{ lineHeight: 1.2 }}>
                  <div>{user?.fullName}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {user ? ROLE_LABELS[user.role] : ''}
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
    </Layout>
  );
}
