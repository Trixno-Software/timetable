'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Form, Input, Button, Typography, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, TableOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const { Title, Text, Paragraph } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [form] = Form.useForm();

  const onSubmit = async (values: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(values.email, values.password);
      const { access, refresh, user } = response.data;

      setAuth(user, access, refresh);
      message.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.details?.non_field_errors?.[0] ||
        error.response?.data?.message ||
        'Login failed. Please check your credentials.';
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        {/* Logo and Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <TableOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, color: '#1a1a2e' }}>
            ScheduleX
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Smart Timetable Management
          </Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              by{' '}
              <a
                href="https://trixno.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#764ba2', fontWeight: 500 }}
              >
                Trixno
              </a>
            </Text>
          </div>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            New school?{' '}
            <Link href="/register" style={{ color: '#764ba2', fontWeight: 600 }}>
              Register your school
            </Link>
          </Text>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Email address"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              style={{
                height: 48,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        {/* Legal Links */}
        <Divider style={{ margin: '24px 0 16px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Legal
          </Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Space split={<Divider type="vertical" />} size={0}>
            <a
              href="https://trixno.com/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#8c8c8c', fontSize: 12 }}
            >
              Terms & Conditions
            </a>
            <a
              href="https://trixno.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#8c8c8c', fontSize: 12 }}
            >
              Privacy Policy
            </a>
            <a
              href="https://trixno.com/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#8c8c8c', fontSize: 12 }}
            >
              Refund Policy
            </a>
          </Space>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            © {new Date().getFullYear()} Trixno Technology Private Limited
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Shape your vision into intelligent software
          </Text>
        </div>
      </Card>
    </div>
  );
}
