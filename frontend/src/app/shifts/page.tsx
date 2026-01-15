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
  TimePicker,
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
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { shiftsApi, branchesApi } from '@/lib/api';

const { Text } = Typography;

interface Shift {
  id: string;
  branch: string;
  branch_name: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function ShiftsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data: shiftsData, isLoading, refetch } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => shiftsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      message.success('Shift created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create shift');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => shiftsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      message.success('Shift updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update shift');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      message.success('Shift deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete shift');
    },
  });

  const openDrawer = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      form.setFieldsValue({
        branch: shift.branch,
        name: shift.name,
        start_time: dayjs(shift.start_time, 'HH:mm'),
        end_time: dayjs(shift.end_time, 'HH:mm'),
      });
    } else {
      setEditingShift(null);
      form.resetFields();
      form.setFieldsValue({
        start_time: dayjs('08:00', 'HH:mm'),
        end_time: dayjs('14:00', 'HH:mm'),
      });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingShift(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        branch: values.branch,
        name: values.name,
        start_time: values.start_time.format('HH:mm'),
        end_time: values.end_time.format('HH:mm'),
      };
      if (editingShift) {
        updateMutation.mutate({ id: editingShift.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const shifts: Shift[] = shiftsData?.data?.results || shiftsData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];

  const filteredShifts = shifts.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.branch_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeShifts = shifts.filter((s) => s.is_active).length;

  const columns: ColumnsType<Shift> = [
    {
      title: 'Shift',
      key: 'shift',
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#764ba2' }} />
          <Text strong>{record.name}</Text>
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
      title: 'Timing',
      key: 'timing',
      render: (_, record) => (
        <Text type="secondary">
          {record.start_time} - {record.end_time}
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
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          <Popconfirm
            title="Delete Shift"
            description="Are you sure you want to delete this shift?"
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
      title="Shifts"
      subtitle="Manage school shifts and timings"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add Shift
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Shifts"
              value={shifts.length}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Active Shifts"
              value={activeShifts}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Branches"
              value={branches.length}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search shifts..."
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
          dataSource={filteredShifts}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} shifts`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No shifts found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add Shift
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingShift ? 'Edit Shift' : 'Add New Shift'}
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
              {editingShift ? 'Update' : 'Create'}
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
            label="Shift Name"
            rules={[{ required: true, message: 'Please enter shift name' }]}
          >
            <Input placeholder="e.g., Morning, Afternoon" />
          </Form.Item>

          <Form.Item
            name="start_time"
            label="Start Time"
            rules={[{ required: true, message: 'Please select start time' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="end_time"
            label="End Time"
            rules={[{ required: true, message: 'Please select end time' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
