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
  InputNumber,
  DatePicker,
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
  SwapOutlined,
  SearchOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { substitutionsApi, timetablesApi, teachersApi, sectionsApi } from '@/lib/api';

const { Text } = Typography;

interface Substitution {
  id: string;
  timetable: string;
  timetable_name: string;
  original_teacher: string;
  original_teacher_name: string;
  substitute_teacher: string;
  substitute_teacher_name: string;
  section: string;
  section_name: string;
  date: string;
  period_number: number | null;
  start_date: string;
  end_date: string;
  reason: string;
  is_active: boolean;
  status: string;
  created_at: string;
}

export default function SubstitutionsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSubstitution, setEditingSubstitution] = useState<Substitution | null>(null);
  const [searchText, setSearchText] = useState('');

  const { data: substitutionsData, isLoading, refetch } = useQuery({
    queryKey: ['substitutions'],
    queryFn: () => substitutionsApi.list(),
  });

  const { data: timetablesData } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetablesApi.list(),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersApi.list(),
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => substitutionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitutions'] });
      message.success('Substitution created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create substitution');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => substitutionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitutions'] });
      message.success('Substitution updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update substitution');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => substitutionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitutions'] });
      message.success('Substitution deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete substitution');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => substitutionsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['substitutions'] });
      message.success('Substitution cancelled successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to cancel substitution');
    },
  });

  const openDrawer = (substitution?: Substitution) => {
    if (substitution) {
      setEditingSubstitution(substitution);
      form.setFieldsValue({
        timetable: substitution.timetable,
        original_teacher: substitution.original_teacher,
        substitute_teacher: substitution.substitute_teacher,
        section: substitution.section,
        date_range: [dayjs(substitution.start_date), dayjs(substitution.end_date)],
        period_number: substitution.period_number || undefined,
        reason: substitution.reason,
      });
    } else {
      setEditingSubstitution(null);
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingSubstitution(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData: any = {
        timetable: values.timetable,
        original_teacher: values.original_teacher,
        substitute_teacher: values.substitute_teacher,
        section: values.section,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        reason: values.reason,
      };
      if (values.period_number) {
        submitData.period_number = values.period_number;
      }

      if (editingSubstitution) {
        updateMutation.mutate({ id: editingSubstitution.id, data: submitData });
      } else {
        createMutation.mutate(submitData);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'blue';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const substitutionsRaw = substitutionsData?.data?.results || substitutionsData?.data;
  const substitutions: Substitution[] = Array.isArray(substitutionsRaw) ? substitutionsRaw : [];
  const timetablesRaw = timetablesData?.data?.results || timetablesData?.data;
  const timetables = Array.isArray(timetablesRaw) ? timetablesRaw : [];
  const teachersRaw = teachersData?.data?.results || teachersData?.data;
  const teachers = Array.isArray(teachersRaw) ? teachersRaw : [];
  const sectionsRaw = sectionsData?.data?.results || sectionsData?.data;
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];

  const filteredSubstitutions = substitutions.filter(
    (s) =>
      s.original_teacher_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.substitute_teacher_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.section_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeCount = substitutions.filter((s) => s.status === 'active').length;
  const pendingCount = substitutions.filter((s) => s.status === 'pending').length;

  const columns: ColumnsType<Substitution> = [
    {
      title: 'Teachers',
      key: 'teachers',
      render: (_, record) => (
        <Space>
          <Text>{record.original_teacher_name}</Text>
          <ArrowRightOutlined style={{ color: '#1677ff' }} />
          <Text strong>{record.substitute_teacher_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Section',
      dataIndex: 'section_name',
      key: 'section',
      render: (name) => <Tag icon={<TeamOutlined />}>{name}</Tag>,
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => (
        <Text type="secondary">
          {record.start_date === record.end_date
            ? record.start_date
            : `${record.start_date} - ${record.end_date}`}
        </Text>
      ),
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => (
        <Tag color={record.period_number ? 'blue' : 'default'}>
          {record.period_number ? `Period ${record.period_number}` : 'All Periods'}
        </Tag>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason) => <Text type="secondary">{reason}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Pending', value: 'pending' },
        { text: 'Completed', value: 'completed' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          {record.status === 'active' && (
            <Popconfirm
              title="Cancel Substitution"
              description="Are you sure you want to cancel this substitution?"
              onConfirm={() => cancelMutation.mutate(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Cancel">
                <Button type="text" icon={<StopOutlined />} style={{ color: '#fa8c16' }} />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="Delete Substitution"
            description="Are you sure you want to delete this substitution?"
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
      title="Substitutions"
      subtitle="Handle teacher substitutions and replacements"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
          Add Substitution
        </Button>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Substitutions"
              value={substitutions.length}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Active"
              value={activeCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Pending"
              value={pendingCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search by teacher or section..."
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
          dataSource={filteredSubstitutions}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} substitutions`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No substitutions found"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                  Add Substitution
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingSubstitution ? 'Edit Substitution' : 'Add New Substitution'}
        placement="right"
        width={520}
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
              {editingSubstitution ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="timetable"
            label="Timetable"
            rules={[{ required: true, message: 'Please select a timetable' }]}
          >
            <Select placeholder="Select timetable" showSearch optionFilterProp="children">
              {timetables.map((tt: any) => (
                <Select.Option key={tt.id} value={tt.id}>
                  {tt.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="original_teacher"
                label="Original Teacher"
                rules={[{ required: true, message: 'Please select original teacher' }]}
              >
                <Select placeholder="Select teacher" showSearch optionFilterProp="children">
                  {teachers.map((teacher: any) => (
                    <Select.Option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="substitute_teacher"
                label="Substitute Teacher"
                rules={[{ required: true, message: 'Please select substitute teacher' }]}
              >
                <Select placeholder="Select teacher" showSearch optionFilterProp="children">
                  {teachers.map((teacher: any) => (
                    <Select.Option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="section"
            label="Section"
            rules={[{ required: true, message: 'Please select a section' }]}
          >
            <Select placeholder="Select section" showSearch optionFilterProp="children">
              {sections.map((section: any) => (
                <Select.Option key={section.id} value={section.id}>
                  {section.name} ({section.grade_name})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="date_range"
            label="Date Range"
            rules={[{ required: true, message: 'Please select date range' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="period_number"
            label="Period Number"
            tooltip="Leave empty to apply to all periods"
          >
            <InputNumber min={1} max={10} placeholder="All periods" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please enter a reason' }]}
          >
            <Input.TextArea rows={3} placeholder="e.g., Medical leave, Personal emergency" />
          </Form.Item>
        </Form>
      </Drawer>
    </AntdLayout>
  );
}
