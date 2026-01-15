'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  Breadcrumb,
  Button,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  ReadOutlined,
  SolutionOutlined,
  ClockCircleOutlined,
  TableOutlined,
  SwapOutlined,
  DownloadOutlined,
  AuditOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useAuthStore, hasRole } from '@/lib/store';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  requiredRole?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/dashboard' },
  {
    key: 'organization',
    icon: <BankOutlined />,
    label: 'Organization',
    path: '',
    requiredRole: 'school_admin',
    children: [
      { key: 'schools', icon: <BankOutlined />, label: 'Schools', path: '/schools', requiredRole: 'super_admin' },
      { key: 'branches', icon: <HomeOutlined />, label: 'Branches', path: '/branches', requiredRole: 'school_admin' },
      { key: 'users', icon: <UserOutlined />, label: 'Users', path: '/users', requiredRole: 'branch_admin' },
    ],
  },
  {
    key: 'academic',
    icon: <ReadOutlined />,
    label: 'Academic Setup',
    path: '',
    requiredRole: 'coordinator',
    children: [
      { key: 'sessions', icon: <CalendarOutlined />, label: 'Sessions', path: '/sessions' },
      { key: 'shifts', icon: <ClockCircleOutlined />, label: 'Shifts', path: '/shifts' },
      { key: 'grades', icon: <ScheduleOutlined />, label: 'Grades', path: '/grades' },
      { key: 'sections', icon: <TeamOutlined />, label: 'Sections', path: '/sections' },
      { key: 'subjects', icon: <ReadOutlined />, label: 'Subjects', path: '/subjects' },
    ],
  },
  {
    key: 'staff',
    icon: <SolutionOutlined />,
    label: 'Staff & Assignments',
    path: '',
    requiredRole: 'coordinator',
    children: [
      { key: 'teachers', icon: <TeamOutlined />, label: 'Teachers', path: '/teachers' },
      { key: 'period-templates', icon: <ClockCircleOutlined />, label: 'Period Templates', path: '/period-templates' },
      { key: 'assignments', icon: <SolutionOutlined />, label: 'Assignments', path: '/assignments' },
    ],
  },
  {
    key: 'timetable',
    icon: <TableOutlined />,
    label: 'Timetable',
    path: '',
    requiredRole: 'teacher',
    children: [
      { key: 'timetables', icon: <TableOutlined />, label: 'View Timetables', path: '/timetables' },
      { key: 'substitutions', icon: <SwapOutlined />, label: 'Substitutions', path: '/substitutions', requiredRole: 'coordinator' },
    ],
  },
  { key: 'exports', icon: <DownloadOutlined />, label: 'Exports', path: '/exports', requiredRole: 'teacher' },
  { key: 'audit', icon: <AuditOutlined />, label: 'Audit Logs', path: '/audit', requiredRole: 'auditor' },
];

interface AntdLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: { title: string; href?: string }[];
  extra?: React.ReactNode;
}

export function AntdLayout({ children, title, subtitle, breadcrumbs, extra }: AntdLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { token } = theme.useToken();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const filterMenuItems = (items: MenuItem[]): MenuProps['items'] => {
    return items
      .filter((item) => {
        if (!item.requiredRole) return true;
        if (!user) return false;
        return hasRole(user.role, item.requiredRole as any);
      })
      .map((item) => {
        if (item.children) {
          const filteredChildren = filterMenuItems(item.children);
          if (filteredChildren && filteredChildren.length > 0) {
            return {
              key: item.key,
              icon: item.icon,
              label: item.label,
              children: filteredChildren,
            };
          }
          return null;
        }
        return {
          key: item.key,
          icon: item.icon,
          label: item.label,
          onClick: () => router.push(item.path),
        };
      })
      .filter(Boolean) as MenuProps['items'];
  };

  const getSelectedKeys = (): string[] => {
    const path = pathname.split('/')[1];
    return [path || 'dashboard'];
  };

  const getOpenKeys = (): string[] => {
    const path = pathname.split('/')[1];
    const findParent = (items: MenuItem[]): string | null => {
      for (const item of items) {
        if (item.children) {
          const found = item.children.find((child) => child.key === path);
          if (found) return item.key;
        }
      }
      return null;
    };
    const parent = findParent(menuItems);
    return parent ? [parent] : [];
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => router.push('/settings'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        width={260}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TableOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          {!collapsed && (
            <Text strong style={{ color: '#fff', fontSize: 18, marginLeft: 12 }}>
              ScheduleX
            </Text>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filterMenuItems(menuItems)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? (isMobile ? 0 : 80) : 260, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            {breadcrumbs && (
              <Breadcrumb
                items={[
                  { title: <HomeOutlined />, href: '/dashboard' },
                  ...breadcrumbs.map((b) => ({
                    title: b.href ? <a href={b.href}>{b.title}</a> : b.title,
                  })),
                ]}
              />
            )}
          </Space>

          <Space size="middle">
            <Badge count={0} showZero={false}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: token.colorPrimary }}>
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Text>{user?.full_name}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 24, minHeight: 'calc(100vh - 64px - 48px)' }}>
          {(title || extra) && (
            <div className="page-header">
              <div>
                {title && <h1 className="page-header-title">{title}</h1>}
                {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
              </div>
              {extra && <Space>{extra}</Space>}
            </div>
          )}
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
