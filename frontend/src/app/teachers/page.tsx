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
  is_active: boolean;
  created_at: string;
}

export default function TeachersPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
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

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    teacher.employee_code?.toLowerCase().includes(searchText.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeTeachers = teachers.filter((t) => t.is_active).length;

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
        <Col xs={8}>
          <Card>
            <Statistic title="Total Teachers" value={teachers.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Active" value={activeTeachers} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic title="Inactive" value={teachers.length - activeTeachers} valueStyle={{ color: '#ff4d4f' }} />
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
    </AntdLayout>
  );
}
