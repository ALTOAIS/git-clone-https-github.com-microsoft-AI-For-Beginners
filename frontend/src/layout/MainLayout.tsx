import { BellOutlined, LogoutOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Badge, Dropdown, Layout, Menu, Popover, Space, Typography, List, Empty } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/endpoints';
import { useAuthStore } from '../auth/authStore';
import { roleLabel } from '../auth/roles';
import type { AppNotification, Role } from '../types';
import { NAV_ITEMS, type NavItem } from './navConfig';

const { Header, Sider, Content } = Layout;

function filterByRole(items: NavItem[], role: Role | undefined): NavItem[] {
  return items
    .filter((item) => !item.roles || (role && item.roles.includes(role)))
    .map((item) => (item.children ? { ...item, children: filterByRole(item.children, role) } : item));
}

function flattenLeaves(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => (item.children && item.children.length > 0 ? flattenLeaves(item.children) : [item]));
}

function matchesLocation(item: NavItem, pathname: string, search: string): boolean {
  const [itemPath, itemQuery] = item.path.split('?');
  if (itemQuery) {
    return pathname === itemPath && search.replace(/^\?/, '') === itemQuery;
  }
  return pathname.startsWith(itemPath);
}

function toMenuItems(items: NavItem[], t: (key: string) => string): MenuProps['items'] {
  return items.map((item) =>
    item.children && item.children.length > 0
      ? {
          key: item.key,
          icon: <item.icon />,
          label: t(item.labelKey),
          children: toMenuItems(item.children, t),
        }
      : {
          key: item.key,
          icon: <item.icon />,
          label: <Link to={item.path}>{t(item.labelKey)}</Link>,
        },
  );
}

export function MainLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const visibleNavItems = useMemo(() => filterByRole(NAV_ITEMS, user?.role), [user]);
  const leafItems = useMemo(() => flattenLeaves(visibleNavItems), [visibleNavItems]);

  const selectedKey = useMemo(() => {
    const match = leafItems.find((item) => matchesLocation(item, location.pathname, location.search));
    return match?.key ?? 'dashboard';
  }, [location.pathname, location.search, leafItems]);

  useEffect(() => {
    const parent = visibleNavItems.find((item) => item.children?.some((child) => child.key === selectedKey));
    if (parent) {
      setOpenKeys((prev) => (prev.includes(parent.key) ? prev : [...prev, parent.key]));
    }
  }, [selectedKey, visibleNavItems]);

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
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          items={toMenuItems(visibleNavItems, t)}
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
            <Popover content={notificationContent} title={t('layout.notifications')} trigger="click" placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Popover>
            <Dropdown
              menu={{
                items: [
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
    </Layout>
  );
}
