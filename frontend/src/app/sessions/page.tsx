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
  DatePicker,
  Switch,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { sessionsApi, branchesApi } from '@/lib/api';

const { Text } = Typography;

interface Session {
  id: string;
  branch: string;
  branch_name: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
}

export default function SessionsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => sessionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('Session created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create session');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sessionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('Session updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update session');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('Session deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete session');
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.setCurrent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success('Session set as current');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to set current session');
    },
  });

  const openDrawer = (session?: Session) => {
    if (session) {
      setEditingSession(session);
      form.setFieldsValue({
        branch: session.branch,
        name: session.name,
        date_range: [dayjs(session.start_date), dayjs(session.end_date)],
        is_current: session.is_current,
      });
    } else {
      setEditingSession(null);
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingSession(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        branch: values.branch,
        name: values.name,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        is_current: values.is_current || false,
      };
      if (editingSession) {
        updateMutation.mutate({ id: editingSession.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const sessions: Session[] = sessionsData?.data?.results || sessionsData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];

  const filteredSessions = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.branch_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeSessions = sessions.filter((s) => s.is_active).length;
  const currentSession = sessions.find((s) => s.is_current);

  const columns: ColumnsType<Session> = [
    {
      title: 'Session',
      key: 'session',
      render: (_, record) => (
        <Space>
          <CalendarOutlined style={{ color: '#764ba2' }} />
          <div>
            <Text strong>{record.name}</Text>
            {record.is_current && (
              <Tag color="blue" style={{ marginLeft: 8 }}>Current</Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name) => name || '-',
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => (
        <Text type="secondary">
          {record.start_date} to {record.end_date}
        </Text>
      ),
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
      width: 180,
      render: (_, record) => (
        <Space>
          {!record.is_current && (
            <Tooltip title="Set as Current">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                onClick={() => setCurrentMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete Session"
            description="Are you sure you want to delete this session?"
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
      title="Sessions"
      subtitle="Manage academic sessions"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add Session
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Sessions"
              value={sessions.length}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Active Sessions"
              value={activeSessions}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Current Session"
              value={currentSession?.name || 'None'}
              valueStyle={{ color: '#764ba2', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search sessions..."
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
          dataSource={filteredSessions}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} sessions`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No sessions found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add Session
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingSession ? 'Edit Session' : 'Add New Session'}
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
              {editingSession ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="branch"
            label="Branch"
            rules={[{ required: true, message: 'Please select a branch' }]}
          >
            <Select placeholder="Select branch">
              {branches.map((branch: any) => (
                <Select.Option key={branch.id} value={branch.id}>
                  {branch.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Session Name"
            rules={[{ required: true, message: 'Please enter session name' }]}
          >
            <Input placeholder="e.g., 2025-2026" />
          </Form.Item>

          <Form.Item
            name="date_range"
            label="Duration"
            rules={[{ required: true, message: 'Please select date range' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="is_current" label="Set as Current Session" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
