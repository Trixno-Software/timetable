'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  Button,
  Form,
  Input,
  Space,
  Tabs,
  Switch,
  Typography,
  Descriptions,
  Tag,
  message,
  Avatar,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  MailOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const { Text, Title } = Typography;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [passwordForm] = Form.useForm();

  const changePasswordMutation = useMutation({
    mutationFn: (values: { old_password: string; new_password: string; confirm_password: string }) =>
      authApi.changePassword(values.old_password, values.new_password, values.confirm_password),
    onSuccess: () => {
      message.success('Password changed successfully');
      passwordForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      if (values.new_password !== values.confirm_password) {
        message.error('Passwords do not match');
        return;
      }
      changePasswordMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      school_admin: 'School Admin',
      branch_admin: 'Branch Admin',
      coordinator: 'Coordinator',
      teacher: 'Teacher',
      auditor: 'Auditor',
    };
    return labels[role] || role.replace('_', ' ');
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'red',
      school_admin: 'purple',
      branch_admin: 'blue',
      coordinator: 'cyan',
      teacher: 'green',
      auditor: 'orange',
    };
    return colors[role] || 'default';
  };

  const tabItems = [
    {
      key: 'profile',
      label: (
        <Space>
          <UserOutlined />
          Profile
        </Space>
      ),
      children: (
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Avatar size={80} style={{ backgroundColor: '#764ba2', fontSize: 32 }}>
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0 }}>{user?.full_name}</Title>
                <Text type="secondary">{user?.email}</Text>
                <br />
                <Tag color={getRoleColor(user?.role || '')} style={{ marginTop: 8 }}>
                  {getRoleLabel(user?.role || '')}
                </Tag>
              </div>
            </div>

            <Divider />

            <Form layout="vertical">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Full Name">
                    <Input value={user?.full_name} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Email">
                    <Input value={user?.email} disabled />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Email cannot be changed
                    </Text>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Role">
                <Input value={getRoleLabel(user?.role || '')} disabled />
              </Form.Item>
              <Button disabled>Save Changes</Button>
              <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                Profile editing coming soon
              </Text>
            </Form>
          </Space>
        </Card>
      ),
    },
    {
      key: 'password',
      label: (
        <Space>
          <LockOutlined />
          Password
        </Space>
      ),
      children: (
        <Card title="Change Password">
          <Form
            form={passwordForm}
            layout="vertical"
            style={{ maxWidth: 400 }}
            requiredMark="optional"
          >
            <Form.Item
              name="old_password"
              label="Current Password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password placeholder="Enter current password" />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password placeholder="Enter new password" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Confirm New Password"
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm new password" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                onClick={handlePasswordSubmit}
                loading={changePasswordMutation.isPending}
              >
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: (
        <Space>
          <BellOutlined />
          Notifications
        </Space>
      ),
      children: (
        <Card title="Notification Preferences">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <Text strong>Email Notifications</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Receive email updates about your timetables
                </Text>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <Text strong>Substitution Alerts</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Get notified when you have a substitution
                </Text>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <Text strong>Timetable Changes</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Receive updates when your timetable is modified
                </Text>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <Text strong>Weekly Summary</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Get a weekly summary of your schedule
                </Text>
              </div>
              <Switch disabled />
            </div>

            <Divider />

            <Space>
              <Button disabled>Save Preferences</Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Notification preferences coming soon
              </Text>
            </Space>
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <AntdLayout
      title="Settings"
      subtitle="Manage your account settings and preferences"
    >
      <Row gutter={24}>
        <Col xs={24} lg={18}>
          <Tabs
            items={tabItems}
            tabPosition="left"
            style={{ minHeight: 400 }}
          />
        </Col>

        <Col xs={24} lg={6}>
          <Card title="Account Information" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <Tag color="success">Active</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Role">
                {getRoleLabel(user?.role || '')}
              </Descriptions.Item>
              <Descriptions.Item label="Branch">
                {user?.branch_name || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </AntdLayout>
  );
}
