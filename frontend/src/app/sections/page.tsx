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
  TeamOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { sectionsApi, gradesApi, shiftsApi } from '@/lib/api';

const { Text } = Typography;

interface Section {
  id: string;
  grade: string;
  grade_name: string;
  shift: string;
  shift_name: string;
  name: string;
  code: string;
  capacity: number;
  is_active: boolean;
}

export default function SectionsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data: sectionsData, isLoading, refetch } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionsApi.list(),
  });

  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => sectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      message.success('Section created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create section');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      message.success('Section updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update section');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      message.success('Section deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete section');
    },
  });

  const openDrawer = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      form.setFieldsValue({
        grade: section.grade,
        shift: section.shift,
        name: section.name,
        code: section.code,
        capacity: section.capacity,
      });
    } else {
      setEditingSection(null);
      form.resetFields();
      form.setFieldsValue({ capacity: 40 });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingSection(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingSection) {
        updateMutation.mutate({ id: editingSection.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const sections: Section[] = sectionsData?.data?.results || sectionsData?.data || [];
  const grades = gradesData?.data?.results || gradesData?.data || [];
  const shifts = shiftsData?.data?.results || shiftsData?.data || [];

  const filteredSections = sections.filter(
    (s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.grade_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.shift_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeSections = sections.filter((s) => s.is_active).length;
  const totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);

  const columns: ColumnsType<Section> = [
    {
      title: 'Section',
      key: 'section',
      render: (_, record) => (
        <Space>
          <TeamOutlined style={{ color: '#764ba2' }} />
          <div>
            <Text strong>{record.name}</Text>
            {record.code && <Text type="secondary" style={{ marginLeft: 8 }}>({record.code})</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'Grade',
      dataIndex: 'grade_name',
      key: 'grade',
      render: (name) => name ? <Tag color="blue">{name}</Tag> : '-',
    },
    {
      title: 'Shift',
      dataIndex: 'shift_name',
      key: 'shift',
      render: (name) => name || '-',
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      sorter: (a, b) => a.capacity - b.capacity,
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
            title="Delete Section"
            description="Are you sure you want to delete this section?"
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
      title="Sections"
      subtitle="Manage class sections"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add Section
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Sections"
              value={sections.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Active Sections"
              value={activeSections}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Capacity"
              value={totalCapacity}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Grades"
              value={grades.length}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search sections..."
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
          dataSource={filteredSections}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} sections`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No sections found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add Section
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingSection ? 'Edit Section' : 'Add New Section'}
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
              {editingSection ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="grade"
            label="Grade"
            rules={[{ required: true, message: 'Please select a grade' }]}
          >
            <Select placeholder="Select grade">
              {grades.map((grade: any) => (
                <Select.Option key={grade.id} value={grade.id}>
                  {grade.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="shift"
            label="Shift"
            rules={[{ required: true, message: 'Please select a shift' }]}
          >
            <Select placeholder="Select shift">
              {shifts.map((shift: any) => (
                <Select.Option key={shift.id} value={shift.id}>
                  {shift.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Section Name"
            rules={[{ required: true, message: 'Please enter section name' }]}
          >
            <Input placeholder="e.g., A, B, C" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Section Code"
            rules={[{ required: true, message: 'Please enter section code' }]}
          >
            <Input placeholder="e.g., A, B, C" />
          </Form.Item>

          <Form.Item
            name="capacity"
            label="Capacity"
            rules={[{ required: true, message: 'Please enter capacity' }]}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="40" />
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
