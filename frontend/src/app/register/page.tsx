'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Steps,
  Space,
  Divider,
  message,
  Row,
  Col,
} from 'antd';
import {
  BankOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  TableOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const { Title, Text, Paragraph } = Typography;

interface SchoolFormData {
  school_name: string;
  school_code: string;
  school_email?: string;
  school_phone?: string;
  school_address?: string;
  school_city?: string;
  school_state?: string;
  school_pincode?: string;
}

interface AdminFormData {
  admin_email: string;
  admin_password: string;
  admin_confirm_password: string;
  admin_first_name: string;
  admin_last_name?: string;
  admin_phone?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolForm] = Form.useForm<SchoolFormData>();
  const [adminForm] = Form.useForm<AdminFormData>();
  const [schoolData, setSchoolData] = useState<SchoolFormData | null>(null);

  const handleSchoolNext = async () => {
    try {
      const values = await schoolForm.validateFields();
      setSchoolData(values);
      setCurrentStep(1);
    } catch {
      // Validation failed
    }
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const handleSubmit = async () => {
    try {
      const adminValues = await adminForm.validateFields();
      if (!schoolData) return;

      setIsLoading(true);

      const registrationData = {
        ...schoolData,
        ...adminValues,
      };

      const response = await authApi.register(registrationData);
      const { access, refresh, user } = response.data;

      setAuth(user, access, refresh);
      message.success('Registration successful! Welcome to ScheduleX');
      router.push('/dashboard');
    } catch (error: any) {
      const errorData = error.response?.data;
      let errorMessage = 'Registration failed. Please try again.';

      if (errorData) {
        // Handle field-specific errors
        const fieldErrors = Object.entries(errorData)
          .filter(([key]) => key !== 'message')
          .map(([key, value]) => {
            const fieldName = key
              .replace('school_', 'School ')
              .replace('admin_', '')
              .replace('_', ' ');
            return `${fieldName}: ${Array.isArray(value) ? value[0] : value}`;
          });

        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('. ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }

      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      title: 'School Details',
      icon: <BankOutlined />,
    },
    {
      title: 'Admin Account',
      icon: <UserOutlined />,
    },
  ];

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
          maxWidth: 600,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        {/* Logo and Branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
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
            Register Your School
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Get started with ScheduleX in minutes
          </Text>
        </div>

        {/* Steps */}
        <Steps
          current={currentStep}
          items={steps}
          style={{ marginBottom: 32 }}
          size="small"
        />

        {/* Step 1: School Details */}
        {currentStep === 0 && (
          <Form
            form={schoolForm}
            layout="vertical"
            requiredMark={false}
            size="large"
            initialValues={schoolData || {}}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="school_name"
                  label="School Name"
                  rules={[{ required: true, message: 'Please enter school name' }]}
                >
                  <Input
                    prefix={<BankOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="School Name"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="school_code"
                  label="School Code"
                  rules={[
                    { required: true, message: 'Please enter school code' },
                    {
                      pattern: /^[A-Za-z0-9]+$/,
                      message: 'Only alphanumeric characters',
                    },
                  ]}
                  extra="Unique identifier (e.g., DPS, SJCS)"
                >
                  <Input placeholder="School Code" style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="school_email"
                  label="School Email"
                  rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="school@example.com"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="school_phone" label="School Phone">
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="+91 9876543210"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="school_address" label="Address">
              <Input.TextArea
                placeholder="School Address"
                rows={2}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="school_city" label="City">
                  <Input placeholder="City" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="school_state" label="State">
                  <Input placeholder="State" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="school_pincode" label="Pincode">
                  <Input placeholder="Pincode" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
              <Button
                type="primary"
                onClick={handleSchoolNext}
                block
                style={{
                  height: 48,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontWeight: 600,
                }}
              >
                Next: Admin Account <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Step 2: Admin Account */}
        {currentStep === 1 && (
          <Form
            form={adminForm}
            layout="vertical"
            requiredMark={false}
            size="large"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="admin_first_name"
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="First Name"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="admin_last_name" label="Last Name">
                  <Input placeholder="Last Name" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="admin_email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="admin@school.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item name="admin_phone" label="Phone Number">
              <Input
                prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="+91 9876543210"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="admin_password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please enter password' },
                    { min: 8, message: 'Password must be at least 8 characters' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="Password"
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="admin_confirm_password"
                  label="Confirm Password"
                  dependencies={['admin_password']}
                  rules={[
                    { required: true, message: 'Please confirm password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('admin_password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Space style={{ width: '100%', marginTop: 16 }} direction="vertical" size={12}>
              <Button
                type="primary"
                onClick={handleSubmit}
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
                {isLoading ? 'Creating Account...' : 'Register School'}
              </Button>
              <Button
                onClick={handleBack}
                block
                style={{
                  height: 44,
                  borderRadius: 8,
                }}
              >
                <ArrowLeftOutlined /> Back
              </Button>
            </Space>
          </Form>
        )}

        {/* Login Link */}
        <Divider style={{ margin: '24px 0 16px' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Already registered?
          </Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Link href="/login">
            <Button type="link" style={{ color: '#764ba2', fontWeight: 500 }}>
              Sign in to your account
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            By registering, you agree to our{' '}
            <a
              href="https://trixno.com/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#764ba2' }}
            >
              Terms & Conditions
            </a>
          </Text>
        </div>
      </Card>
    </div>
  );
}
