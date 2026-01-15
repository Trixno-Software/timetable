'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Tag,
  Drawer,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Typography,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  BankOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { branchesApi, schoolsApi } from '@/lib/api';

const { Text, Title } = Typography;

interface Branch {
  id: string;
  school: string;
  school_name: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  city: string;
  is_active: boolean;
}

interface School {
  id: string;
  name: string;
  code: string;
}

export default function BranchesPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const { data: branchesData, isLoading, refetch } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => branchesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      message.success('Branch created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create branch');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => branchesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      message.success('Branch updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update branch');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      message.success('Branch deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete branch');
    },
  });

  const openDrawer = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      form.setFieldsValue({
        school: branch.school,
        name: branch.name,
        code: branch.code,
        email: branch.email || '',
        phone: branch.phone || '',
        city: branch.city || '',
      });
    } else {
      setEditingBranch(null);
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingBranch(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingBranch) {
        updateMutation.mutate({ id: editingBranch.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const branches: Branch[] = branchesData?.data?.results || branchesData?.data || [];
  const schools: School[] = schoolsData?.data?.results || schoolsData?.data || [];

  const activeBranches = branches.filter((b) => b.is_active).length;

  return (
    <AntdLayout
      title="Branches"
      subtitle="Manage school branches and locations"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            Add Branch
          </Button>
        </Space>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Branches"
              value={branches.length}
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Active Branches"
              value={activeBranches}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Schools"
              value={schools.length}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Branches Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="ant-spin ant-spin-spinning">
            <span className="ant-spin-dot ant-spin-dot-spin">
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
            </span>
          </div>
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No branches yet"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              Add Your First Branch
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {branches.map((branch) => (
            <Col xs={24} sm={12} lg={8} key={branch.id}>
              <Card
                hoverable
                actions={[
                  <Tooltip title="Edit" key="edit">
                    <EditOutlined onClick={() => openDrawer(branch)} />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="Delete Branch"
                    description="Are you sure you want to delete this branch?"
                    onConfirm={() => deleteMutation.mutate(branch.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <DeleteOutlined style={{ color: '#ff4d4f' }} />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: branch.is_active ? '#e6f4ff' : '#fff1f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HomeOutlined
                        style={{
                          fontSize: 24,
                          color: branch.is_active ? '#1677ff' : '#ff4d4f',
                        }}
                      />
                    </div>
                  }
                  title={
                    <Space>
                      <Text strong>{branch.name}</Text>
                      <Tag color={branch.is_active ? 'success' : 'error'}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text type="secondary">{branch.code}</Text>
                      <Tag icon={<BankOutlined />}>{branch.school_name}</Tag>
                    </Space>
                  }
                />
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {branch.city && (
                    <Space>
                      <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
                      <Text type="secondary">{branch.city}</Text>
                    </Space>
                  )}
                  {branch.phone && (
                    <Space>
                      <PhoneOutlined style={{ color: '#8c8c8c' }} />
                      <Text type="secondary">{branch.phone}</Text>
                    </Space>
                  )}
                  {branch.email && (
                    <Space>
                      <MailOutlined style={{ color: '#8c8c8c' }} />
                      <Text type="secondary" ellipsis style={{ maxWidth: 180 }}>
                        {branch.email}
                      </Text>
                    </Space>
                  )}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingBranch ? 'Edit Branch' : 'Add New Branch'}
        placement="right"
        width={480}
        onClose={closeDrawer}
        open={drawerOpen}
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingBranch ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="school"
            label="School"
            rules={[{ required: true, message: 'Please select a school' }]}
          >
            <Select placeholder="Select school">
              {schools.map((school) => (
                <Select.Option key={school.id} value={school.id}>
                  {school.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Branch Name"
            rules={[{ required: true, message: 'Please enter branch name' }]}
          >
            <Input placeholder="e.g., Main Campus" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Branch Code"
            rules={[{ required: true, message: 'Please enter branch code' }]}
            tooltip="A unique identifier for this branch"
          >
            <Input placeholder="e.g., MAIN01" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" placeholder="branch@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 234 567 8900" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="city" label="City">
            <Input placeholder="e.g., New York" />
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
