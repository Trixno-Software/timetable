'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
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
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { usersApi, branchesApi } from '@/lib/api';

const { Text } = Typography;

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  branch: string | null;
  branch_name: string | null;
  is_active: boolean;
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'red' },
  { value: 'school_admin', label: 'School Admin', color: 'purple' },
  { value: 'branch_admin', label: 'Branch Admin', color: 'blue' },
  { value: 'coordinator', label: 'Coordinator', color: 'cyan' },
  { value: 'teacher', label: 'Teacher', color: 'green' },
  { value: 'auditor', label: 'Auditor', color: 'orange' },
];

const getRoleColor = (role: string) => {
  return ROLES.find(r => r.value === role)?.color || 'default';
};

const getRoleLabel = (role: string) => {
  return ROLES.find(r => r.value === role)?.label || role.replace('_', ' ');
};

export default function UsersPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User activated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to activate user');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success('User deactivated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to deactivate user');
    },
  });

  const openDrawer = (user?: User) => {
    if (user) {
      setEditingUser(user);
      form.setFieldsValue({
        email: user.email,
        full_name: user.full_name,
        password: '',
        role: user.role,
        branch: user.branch || undefined,
      });
    } else {
      setEditingUser(null);
      form.resetFields();
      form.setFieldsValue({ role: 'teacher' });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData: any = {
        email: values.email,
        full_name: values.full_name,
        role: values.role,
      };
      if (values.branch) submitData.branch = values.branch;
      if (values.password) submitData.password = values.password;

      if (editingUser) {
        updateMutation.mutate({ id: editingUser.id, data: submitData });
      } else {
        createMutation.mutate(submitData);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const users: User[] = usersData?.data?.results || usersData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email.toLowerCase().includes(searchText.toLowerCase()) ||
      u.role.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.role.includes('admin')).length;

  const columns: ColumnsType<User> = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#764ba2' }}>
            {record.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <Text strong>{record.full_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)}>
          {getRoleLabel(role)}
        </Tag>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name) => name || '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          {record.is_active ? (
            <Popconfirm
              title="Deactivate User"
              description="Are you sure you want to deactivate this user?"
              onConfirm={() => deactivateMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Deactivate">
                <Button type="text" icon={<StopOutlined style={{ color: '#fa8c16' }} />} />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="Activate">
              <Button
                type="text"
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                onClick={() => activateMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to delete this user?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AntdLayout
      title="Users"
      subtitle="Manage system users"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add User
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={users.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Active Users"
              value={activeUsers}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Admin Users"
              value={adminUsers}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} users`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No users found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add User
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingUser ? 'Edit User' : 'Add New User'}
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
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Password (leave blank to keep)' : 'Password'}
            rules={[
              { required: !editingUser, message: 'Please enter password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="********" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select role">
              {ROLES.map((role) => (
                <Select.Option key={role.value} value={role.value}>
                  {role.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="branch"
            label="Branch (optional)"
          >
            <Select placeholder="No branch" allowClear>
              {branches.map((branch: any) => (
                <Select.Option key={branch.id} value={branch.id}>
                  {branch.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
