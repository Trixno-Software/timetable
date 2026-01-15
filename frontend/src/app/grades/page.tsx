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
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { gradesApi, branchesApi } from '@/lib/api';

const { Text } = Typography;

interface Grade {
  id: string;
  branch: string;
  branch_name: string;
  name: string;
  code: string;
  order: number;
  is_active: boolean;
  section_count?: number;
}

export default function GradesPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data: gradesData, isLoading, refetch } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => gradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      message.success('Grade created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create grade');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => gradesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      message.success('Grade updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update grade');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      message.success('Grade deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete grade');
    },
  });

  const openDrawer = (grade?: Grade) => {
    if (grade) {
      setEditingGrade(grade);
      form.setFieldsValue({
        branch: grade.branch,
        name: grade.name,
        code: grade.code,
        order: grade.order,
      });
    } else {
      setEditingGrade(null);
      form.resetFields();
      form.setFieldsValue({ order: 1 });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingGrade(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingGrade) {
        updateMutation.mutate({ id: editingGrade.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const grades: Grade[] = gradesData?.data?.results || gradesData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];

  const filteredGrades = grades.filter(
    (g) =>
      g.name.toLowerCase().includes(searchText.toLowerCase()) ||
      g.code.toLowerCase().includes(searchText.toLowerCase()) ||
      g.branch_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeGrades = grades.filter((g) => g.is_active).length;

  const columns: ColumnsType<Grade> = [
    {
      title: 'Grade',
      key: 'grade',
      render: (_, record) => (
        <Space>
          <BookOutlined style={{ color: '#764ba2' }} />
          <Text strong>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag>{code}</Tag>,
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name) => name || '-',
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
      sorter: (a, b) => a.order - b.order,
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
            title="Delete Grade"
            description="Are you sure you want to delete this grade?"
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
      title="Grades"
      subtitle="Manage academic grades"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add Grade
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Total Grades"
              value={grades.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="Active Grades"
              value={activeGrades}
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
            placeholder="Search grades..."
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
          dataSource={filteredGrades}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} grades`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No grades found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add Grade
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingGrade ? 'Edit Grade' : 'Add New Grade'}
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
              {editingGrade ? 'Update' : 'Create'}
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
                  {branch.name} ({branch.school_name})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Grade Name"
            rules={[{ required: true, message: 'Please enter grade name' }]}
          >
            <Input placeholder="e.g., Grade 1, Nursery, LKG" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Grade Code"
            rules={[{ required: true, message: 'Please enter grade code' }]}
          >
            <Input placeholder="e.g., G1, NUR, LKG" />
          </Form.Item>

          <Form.Item
            name="order"
            label="Display Order"
            rules={[{ required: true, message: 'Please enter display order' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
