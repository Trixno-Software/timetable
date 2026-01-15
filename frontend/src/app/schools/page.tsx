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
  InputNumber,
  Select,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Descriptions,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { schoolsApi } from '@/lib/api';

const { Text, Title } = Typography;

interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  plan: string;
  max_branches: number;
  is_active: boolean;
  branch_count: number;
  user_count: number;
  created_at: string;
}

export default function SchoolsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => schoolsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      message.success('School created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create school');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => schoolsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      message.success('School updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update school');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schoolsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      message.success('School deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete school');
    },
  });

  const openDrawer = (school?: School) => {
    if (school) {
      setEditingSchool(school);
      form.setFieldsValue({
        name: school.name,
        code: school.code,
        email: school.email || '',
        phone: school.phone || '',
        city: school.city || '',
        address: school.address || '',
        plan: school.plan || 'basic',
        max_branches: school.max_branches || 1,
      });
    } else {
      setEditingSchool(null);
      form.resetFields();
      form.setFieldsValue({ plan: 'basic', max_branches: 1 });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingSchool(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingSchool) {
        updateMutation.mutate({ id: editingSchool.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const viewDetails = (school: School) => {
    setSelectedSchool(school);
    setDetailDrawerOpen(true);
  };

  const schools: School[] = data?.data?.results || data?.data || [];

  const filteredSchools = schools.filter((school) =>
    school.name.toLowerCase().includes(searchText.toLowerCase()) ||
    school.code.toLowerCase().includes(searchText.toLowerCase()) ||
    school.city?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeSchools = schools.filter((s) => s.is_active).length;
  const totalBranches = schools.reduce((sum, s) => sum + (s.branch_count || 0), 0);
  const totalUsers = schools.reduce((sum, s) => sum + (s.user_count || 0), 0);

  const columns: ColumnsType<School> = [
    {
      title: 'School',
      key: 'school',
      render: (_, record) => (
        <Space>
          <BankOutlined style={{ fontSize: 20, color: '#1677ff' }} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'city',
      key: 'city',
      render: (city) => city || '-',
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan) => (
        <Tag color={plan === 'enterprise' ? 'gold' : plan === 'premium' ? 'blue' : 'default'}>
          {plan?.toUpperCase() || 'BASIC'}
        </Tag>
      ),
    },
    {
      title: 'Branches',
      key: 'branches',
      render: (_, record) => (
        <Text>
          {record.branch_count || 0} / {record.max_branches}
        </Text>
      ),
    },
    {
      title: 'Users',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count) => count || 0,
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="text" icon={<EyeOutlined />} onClick={() => viewDetails(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete School"
            description="Are you sure you want to delete this school?"
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
      title="Schools"
      subtitle="Manage all schools in your system"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add School
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic title="Total Schools" value={schools.length} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Active Schools" value={activeSchools} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Total Branches" value={totalBranches} />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search schools..."
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
          dataSource={filteredSchools}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} schools`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No schools found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add Your First School
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingSchool ? 'Edit School' : 'Add New School'}
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
              {editingSchool ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="name"
            label="School Name"
            rules={[{ required: true, message: 'Please enter school name' }]}
          >
            <Input placeholder="e.g., Springfield High School" />
          </Form.Item>

          <Form.Item
            name="code"
            label="School Code"
            rules={[{ required: true, message: 'Please enter school code' }]}
            tooltip="A unique identifier for this school"
          >
            <Input placeholder="e.g., SHS001" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" placeholder="school@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 234 567 8900" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="city" label="City">
            <Input placeholder="e.g., Springfield" />
          </Form.Item>

          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Full address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="plan"
                label="Plan"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="basic">Basic</Select.Option>
                  <Select.Option value="premium">Premium</Select.Option>
                  <Select.Option value="enterprise">Enterprise</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="max_branches"
                label="Max Branches"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        title="School Details"
        placement="right"
        width={520}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
        extra={
          <Button type="primary" onClick={() => {
            setDetailDrawerOpen(false);
            if (selectedSchool) openDrawer(selectedSchool);
          }}>
            Edit School
          </Button>
        }
      >
        {selectedSchool && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <BankOutlined style={{ fontSize: 48, color: '#1677ff' }} />
              <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
                {selectedSchool.name}
              </Title>
              <Text type="secondary">{selectedSchool.code}</Text>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Status">
                <Tag color={selectedSchool.is_active ? 'success' : 'error'}>
                  {selectedSchool.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Plan">
                <Tag color={selectedSchool.plan === 'enterprise' ? 'gold' : selectedSchool.plan === 'premium' ? 'blue' : 'default'}>
                  {selectedSchool.plan?.toUpperCase() || 'BASIC'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Email">{selectedSchool.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedSchool.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="City">{selectedSchool.city || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{selectedSchool.address || '-'}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Usage Statistics">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Branches"
                    value={selectedSchool.branch_count || 0}
                    suffix={`/ ${selectedSchool.max_branches}`}
                  />
                </Col>
                <Col span={12}>
                  <Statistic title="Users" value={selectedSchool.user_count || 0} />
                </Col>
              </Row>
            </Card>

            <Text type="secondary" style={{ fontSize: 12 }}>
              Created: {selectedSchool.created_at ? new Date(selectedSchool.created_at).toLocaleDateString() : '-'}
            </Text>
          </Space>
        )}
      </Drawer>
    </AntdLayout>
  );
}
