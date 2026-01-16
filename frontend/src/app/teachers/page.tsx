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
  Upload,
  Modal,
  Typography,
  Avatar,
  Descriptions,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { teachersApi, subjectsApi, branchesApi, exportsApi } from '@/lib/api';

const { Text, Title } = Typography;

interface Teacher {
  id: string;
  branch: string;
  branch_name: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  subjects: string[];
  subject_names: string[];
  status: 'active' | 'on_leave' | 'resigned' | 'terminated';
  departure_date?: string;
  departure_reason?: string;
  replaced_by?: string;
  replaced_by_name?: string;
  has_left: boolean;
  needs_replacement: boolean;
  assignment_count: number;
  is_active: boolean;
  created_at: string;
}

export default function TeachersPage() {
  const [form] = Form.useForm();
  const [departureForm] = Form.useForm();
  const [replacementForm] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [departureModalOpen, setDepartureModalOpen] = useState(false);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [departingTeacher, setDepartingTeacher] = useState<Teacher | null>(null);
  const [searchText, setSearchText] = useState('');
  const [importBranch, setImportBranch] = useState('');
  const [importFile, setImportFile] = useState<any>(null);

  const { data: teachersData, isLoading, refetch } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersApi.list(),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => teachersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      message.success('Teacher created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create teacher');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => teachersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      message.success('Teacher updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update teacher');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teachersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      message.success('Teacher deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete teacher');
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file, branchId }: { file: File; branchId: string }) =>
      teachersApi.import(file, branchId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      const result = response.data;
      message.success(`Import complete: ${result.created || 0} created, ${result.updated || 0} updated`);
      if (result.errors?.length > 0) {
        message.warning(`${result.errors.length} errors occurred`);
      }
      setImportModalOpen(false);
      setImportFile(null);
      setImportBranch('');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Import failed');
    },
  });

  const markDepartedMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      teachersApi.markDeparted(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      const result = response.data;
      message.success(`Teacher marked as departed`);
      if (result.active_assignments_needing_replacement > 0) {
        message.warning(`${result.active_assignments_needing_replacement} assignments need replacement`);
      }
      setDepartureModalOpen(false);
      setDepartingTeacher(null);
      departureForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Failed to mark teacher as departed');
    },
  });

  const replacementMutation = useMutation({
    mutationFn: (data: any) => teachersApi.replace(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      const result = response.data.results;
      message.success(
        `Replacement complete: ${result.assignments_transferred} assignments, ${result.timetable_entries_transferred} timetable entries transferred`
      );
      setReplacementModalOpen(false);
      setDepartingTeacher(null);
      replacementForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Failed to replace teacher');
    },
  });

  const teachers: Teacher[] = teachersData?.data?.results || teachersData?.data || [];
  const subjects = subjectsData?.data?.results || subjectsData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];

  const openDrawer = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      form.setFieldsValue({
        branch: teacher.branch,
        employee_code: teacher.employee_code,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email || '',
        phone: teacher.phone || '',
        subjects: teacher.subjects || [],
      });
    } else {
      setEditingTeacher(null);
      form.resetFields();
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingTeacher(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingTeacher) {
        updateMutation.mutate({ id: editingTeacher.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const viewDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDetailDrawerOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await exportsApi.template('teachers');
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teachers_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('Template downloaded');
    } catch (error) {
      message.error('Failed to download template');
    }
  };

  const handleImport = () => {
    if (!importFile || !importBranch) {
      message.error('Please select a branch and file');
      return;
    }
    importMutation.mutate({ file: importFile, branchId: importBranch });
  };

  const openDepartureModal = (teacher: Teacher) => {
    setDepartingTeacher(teacher);
    departureForm.setFieldsValue({
      status: 'resigned',
      departure_date: new Date().toISOString().split('T')[0],
    });
    setDepartureModalOpen(true);
  };

  const handleMarkDeparted = async () => {
    if (!departingTeacher) return;
    try {
      const values = await departureForm.validateFields();
      markDepartedMutation.mutate({ id: departingTeacher.id, data: values });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const openReplacementModal = (teacher: Teacher) => {
    setDepartingTeacher(teacher);
    replacementForm.resetFields();
    setReplacementModalOpen(true);
  };

  const handleReplacement = async () => {
    if (!departingTeacher) return;
    try {
      const values = await replacementForm.validateFields();
      replacementMutation.mutate({
        departing_teacher_id: departingTeacher.id,
        replacement_teacher_id: values.replacement_teacher_id,
        transfer_assignments: values.transfer_assignments ?? true,
        transfer_timetable_entries: values.transfer_timetable_entries ?? true,
        status: departingTeacher.status === 'active' ? 'resigned' : departingTeacher.status,
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Filter active teachers for replacement dropdown (exclude departing teacher)
  const availableReplacements = teachers.filter(
    (t) => t.status === 'active' && t.id !== departingTeacher?.id && t.branch === departingTeacher?.branch
  );

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    teacher.employee_code?.toLowerCase().includes(searchText.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeTeachers = teachers.filter((t) => t.status === 'active').length;
  const departedTeachers = teachers.filter((t) => t.has_left).length;
  const needsReplacement = teachers.filter((t) => t.needs_replacement).length;

  const columns: ColumnsType<Teacher> = [
    {
      title: 'Teacher',
      key: 'teacher',
      render: (_, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }}>
            {record.first_name?.charAt(0)?.toUpperCase() || 'T'}
          </Avatar>
          <div>
            <Text strong>{record.full_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.employee_code}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          {record.email && (
            <div>
              <MailOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
            </div>
          )}
          {record.phone && (
            <div>
              <PhoneOutlined style={{ marginRight: 4, color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Text>
            </div>
          )}
          {!record.email && !record.phone && <Text type="secondary">-</Text>}
        </div>
      ),
    },
    {
      title: 'Branch',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (text) => text || '-',
    },
    {
      title: 'Subjects',
      key: 'subjects',
      render: (_, record) => (
        <Space wrap size={[0, 4]}>
          {record.subject_names?.slice(0, 2).map((subject, i) => (
            <Tag key={i} color="blue">{subject}</Tag>
          ))}
          {record.subject_names?.length > 2 && (
            <Tag>+{record.subject_names.length - 2}</Tag>
          )}
          {(!record.subject_names || record.subject_names.length === 0) && (
            <Text type="secondary">No subjects</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const statusColors: Record<string, string> = {
          active: 'success',
          on_leave: 'warning',
          resigned: 'default',
          terminated: 'error',
        };
        const statusLabels: Record<string, string> = {
          active: 'Active',
          on_leave: 'On Leave',
          resigned: 'Resigned',
          terminated: 'Terminated',
        };
        return (
          <Space direction="vertical" size={0}>
            <Tag color={statusColors[record.status] || 'default'}>
              {statusLabels[record.status] || record.status}
            </Tag>
            {record.needs_replacement && (
              <Tag color="error" icon={<WarningOutlined />} style={{ marginTop: 4 }}>
                Needs Replacement
              </Tag>
            )}
            {record.replaced_by_name && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Replaced by: {record.replaced_by_name}
              </Text>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'On Leave', value: 'on_leave' },
        { text: 'Resigned', value: 'resigned' },
        { text: 'Terminated', value: 'terminated' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Assignments',
      key: 'assignments',
      align: 'center',
      width: 100,
      render: (_, record) => (
        <Tag color={record.assignment_count > 0 ? 'blue' : 'default'}>
          {record.assignment_count || 0}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="text" icon={<EyeOutlined />} onClick={() => viewDetails(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer(record)} />
          </Tooltip>
          {record.status === 'active' && (
            <Tooltip title="Mark as Departed">
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={() => openDepartureModal(record)}
                style={{ color: '#faad14' }}
              />
            </Tooltip>
          )}
          {record.needs_replacement && (
            <Tooltip title="Assign Replacement">
              <Button
                type="text"
                icon={<SwapOutlined />}
                onClick={() => openReplacementModal(record)}
                style={{ color: '#1677ff' }}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete Teacher"
            description="Are you sure you want to delete this teacher?"
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
      title="Teachers"
      subtitle="Manage your teaching staff"
      extra={
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Import
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            Add Teacher
          </Button>
        </Space>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={6}>
          <Card>
            <Statistic title="Total Teachers" value={teachers.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <Statistic title="Active" value={activeTeachers} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <Statistic title="Departed" value={departedTeachers} valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card>
            <Statistic
              title="Needs Replacement"
              value={needsReplacement}
              valueStyle={{ color: needsReplacement > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={needsReplacement > 0 ? <WarningOutlined /> : null}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search by name, code, or email..."
            prefix={<SearchOutlined />}
            style={{ width: 350 }}
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
          dataSource={filteredTeachers}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} teachers`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No teachers found"
              >
                <Space>
                  <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
                    Import from Excel
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                    Add Teacher
                  </Button>
                </Space>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
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
              {editingTeacher ? 'Update' : 'Create'}
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
              {branches.map((b: any) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="employee_code"
            label="Employee Code"
            rules={[{ required: true, message: 'Please enter employee code' }]}
            tooltip="Unique identifier for this teacher"
          >
            <Input placeholder="e.g., T001" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="First name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="last_name"
                label="Last Name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Last name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" placeholder="teacher@school.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 234 567 8900" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subjects"
            label="Subjects"
            tooltip="Subjects this teacher can teach"
          >
            <Select
              mode="multiple"
              placeholder="Select subjects"
              optionFilterProp="children"
              showSearch
            >
              {subjects.map((s: any) => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer
        title="Teacher Details"
        placement="right"
        width={520}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
        extra={
          <Button type="primary" onClick={() => {
            setDetailDrawerOpen(false);
            if (selectedTeacher) openDrawer(selectedTeacher);
          }}>
            Edit
          </Button>
        }
      >
        {selectedTeacher && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Avatar size={80} style={{ backgroundColor: '#1677ff' }}>
                {selectedTeacher.first_name?.charAt(0)?.toUpperCase() || 'T'}
              </Avatar>
              <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
                {selectedTeacher.full_name}
              </Title>
              <Text type="secondary">{selectedTeacher.employee_code}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={selectedTeacher.is_active ? 'success' : 'error'}>
                  {selectedTeacher.is_active ? 'Active' : 'Inactive'}
                </Tag>
              </div>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Branch">{selectedTeacher.branch_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedTeacher.email ? (
                  <a href={`mailto:${selectedTeacher.email}`}>{selectedTeacher.email}</a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {selectedTeacher.phone ? (
                  <a href={`tel:${selectedTeacher.phone}`}>{selectedTeacher.phone}</a>
                ) : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Subjects">
              {selectedTeacher.subject_names?.length > 0 ? (
                <Space wrap>
                  {selectedTeacher.subject_names.map((subject, i) => (
                    <Tag key={i} color="blue">{subject}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No subjects assigned</Text>
              )}
            </Card>
          </Space>
        )}
      </Drawer>

      {/* Import Modal */}
      <Modal
        title="Import Teachers"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setImportFile(null);
          setImportBranch('');
        }}
        footer={[
          <Button key="cancel" onClick={() => setImportModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importMutation.isPending}
            onClick={handleImport}
            disabled={!importFile || !importBranch}
          >
            Import
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button block icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            Download Template
          </Button>

          <Divider />

          <Form layout="vertical">
            <Form.Item label="Branch" required>
              <Select
                placeholder="Select branch for import"
                value={importBranch}
                onChange={setImportBranch}
              >
                {branches.map((b: any) => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Excel File" required>
              <Upload
                accept=".xlsx,.xls"
                maxCount={1}
                beforeUpload={(file) => {
                  setImportFile(file);
                  return false;
                }}
                onRemove={() => setImportFile(null)}
              >
                <Button icon={<UploadOutlined />}>Select File</Button>
              </Upload>
            </Form.Item>
          </Form>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Required columns: employee_code, first_name, last_name. Optional: email, phone, subjects
          </Text>
        </Space>
      </Modal>

      {/* Mark Departure Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            Mark Teacher as Departed
          </Space>
        }
        open={departureModalOpen}
        onCancel={() => {
          setDepartureModalOpen(false);
          setDepartingTeacher(null);
          departureForm.resetFields();
        }}
        onOk={handleMarkDeparted}
        okText="Mark as Departed"
        okButtonProps={{
          loading: markDepartedMutation.isPending,
          danger: true,
        }}
      >
        {departingTeacher && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffd591' }}>
              <Space>
                <Avatar style={{ backgroundColor: '#1677ff' }}>
                  {departingTeacher.first_name?.charAt(0)?.toUpperCase() || 'T'}
                </Avatar>
                <div>
                  <Text strong>{departingTeacher.full_name}</Text>
                  <br />
                  <Text type="secondary">{departingTeacher.employee_code}</Text>
                </div>
              </Space>
              {departingTeacher.assignment_count > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Tag color="warning" icon={<WarningOutlined />}>
                    {departingTeacher.assignment_count} active assignments will need replacement
                  </Tag>
                </div>
              )}
            </div>

            <Form form={departureForm} layout="vertical">
              <Form.Item
                name="status"
                label="Departure Type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="resigned">Resigned</Select.Option>
                  <Select.Option value="terminated">Terminated</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="departure_date" label="Departure Date">
                <Input type="date" />
              </Form.Item>

              <Form.Item name="departure_reason" label="Reason (Optional)">
                <Input.TextArea rows={3} placeholder="Enter reason for departure..." />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      {/* Teacher Replacement Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#1677ff' }} />
            Assign Replacement Teacher
          </Space>
        }
        open={replacementModalOpen}
        onCancel={() => {
          setReplacementModalOpen(false);
          setDepartingTeacher(null);
          replacementForm.resetFields();
        }}
        onOk={handleReplacement}
        okText="Replace Teacher"
        okButtonProps={{
          loading: replacementMutation.isPending,
          type: 'primary',
        }}
        width={600}
      >
        {departingTeacher && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Departing Teacher</Text>
              <Space>
                <Avatar style={{ backgroundColor: '#8c8c8c' }}>
                  {departingTeacher.first_name?.charAt(0)?.toUpperCase() || 'T'}
                </Avatar>
                <div>
                  <Text>{departingTeacher.full_name}</Text>
                  <br />
                  <Text type="secondary">{departingTeacher.employee_code}</Text>
                </div>
              </Space>
              <div style={{ marginTop: 12 }}>
                <Space wrap>
                  <Tag color="blue">{departingTeacher.assignment_count} assignments</Tag>
                  {departingTeacher.subject_names?.map((s, i) => (
                    <Tag key={i}>{s}</Tag>
                  ))}
                </Space>
              </div>
            </div>

            <Form form={replacementForm} layout="vertical">
              <Form.Item
                name="replacement_teacher_id"
                label="Replacement Teacher"
                rules={[{ required: true, message: 'Please select a replacement teacher' }]}
              >
                <Select
                  placeholder="Select replacement teacher"
                  showSearch
                  optionFilterProp="children"
                >
                  {availableReplacements.map((teacher) => (
                    <Select.Option key={teacher.id} value={teacher.id}>
                      <Space>
                        <Avatar size="small" style={{ backgroundColor: '#1677ff' }}>
                          {teacher.first_name?.charAt(0)}
                        </Avatar>
                        {teacher.full_name} ({teacher.employee_code})
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="transfer_assignments"
                valuePropName="checked"
                initialValue={true}
              >
                <Space>
                  <Input type="checkbox" defaultChecked />
                  <Text>Transfer all assignments to replacement teacher</Text>
                </Space>
              </Form.Item>

              <Form.Item
                name="transfer_timetable_entries"
                valuePropName="checked"
                initialValue={true}
              >
                <Space>
                  <Input type="checkbox" defaultChecked />
                  <Text>Transfer all timetable entries to replacement teacher</Text>
                </Space>
              </Form.Item>
            </Form>

            <div style={{ padding: 12, background: '#e6f4ff', borderRadius: 8, border: '1px solid #91caff' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>What happens:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>All active assignments will be transferred to the replacement teacher</li>
                  <li>All timetable entries will be updated with the new teacher</li>
                  <li>The departing teacher will be marked as inactive</li>
                  <li>Subjects from the departing teacher will be added to the replacement</li>
                </ul>
              </Text>
            </div>
          </Space>
        )}
      </Modal>
    </AntdLayout>
  );
}
