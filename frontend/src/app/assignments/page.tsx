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
  Select,
  InputNumber,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Modal,
  Upload,
  Typography,
  Input,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SolutionOutlined,
  UploadOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  TeamOutlined,
  ReadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { assignmentsApi, sectionsApi, subjectsApi, teachersApi, sessionsApi, branchesApi } from '@/lib/api';

const { Text } = Typography;

interface Assignment {
  id: string;
  section: string;
  section_name: string;
  subject: string;
  subject_name: string;
  teacher: string;
  teacher_name: string;
  session: string;
  session_name: string;
  weekly_periods: number;
  is_active: boolean;
}

export default function AssignmentsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [searchText, setSearchText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBranch, setImportBranch] = useState('');
  const [importSession, setImportSession] = useState('');

  const { data: assignmentsData, isLoading, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentsApi.list(),
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionsApi.list(),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersApi.list(),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => assignmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      message.success('Assignment created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create assignment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assignmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      message.success('Assignment updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update assignment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assignmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      message.success('Assignment deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete assignment');
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file, branchId, sessionId }: { file: File; branchId: string; sessionId: string }) =>
      assignmentsApi.import(file, branchId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      message.success('Assignments imported successfully');
      closeImportModal();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to import assignments');
    },
  });

  const openDrawer = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      form.setFieldsValue({
        section: assignment.section,
        subject: assignment.subject,
        teacher: assignment.teacher,
        session: assignment.session,
        weekly_periods: assignment.weekly_periods,
      });
    } else {
      setEditingAssignment(null);
      form.resetFields();
      form.setFieldsValue({ weekly_periods: 5 });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingAssignment(null);
    form.resetFields();
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportBranch('');
    setImportSession('');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAssignment) {
        updateMutation.mutate({ id: editingAssignment.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleImport = () => {
    if (importFile && importBranch && importSession) {
      importMutation.mutate({ file: importFile, branchId: importBranch, sessionId: importSession });
    } else {
      message.warning('Please select branch, session, and file');
    }
  };

  const assignments: Assignment[] = assignmentsData?.data?.results || assignmentsData?.data || [];
  const sections = sectionsData?.data?.results || sectionsData?.data || [];
  const subjects = subjectsData?.data?.results || subjectsData?.data || [];
  const teachers = teachersData?.data?.results || teachersData?.data || [];
  const sessions = sessionsData?.data?.results || sessionsData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];

  const filteredAssignments = assignments.filter(
    (a) =>
      a.section_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.subject_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.teacher_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeAssignments = assignments.filter((a) => a.is_active).length;
  const uniqueTeachers = new Set(assignments.map((a) => a.teacher)).size;
  const totalPeriods = assignments.reduce((sum, a) => sum + (a.weekly_periods || 0), 0);

  const columns: ColumnsType<Assignment> = [
    {
      title: 'Section',
      key: 'section',
      render: (_, record) => (
        <Space>
          <TeamOutlined style={{ color: '#1677ff' }} />
          <Text strong>{record.section_name}</Text>
        </Space>
      ),
      sorter: (a, b) => (a.section_name || '').localeCompare(b.section_name || ''),
    },
    {
      title: 'Subject',
      key: 'subject',
      render: (_, record) => (
        <Space>
          <ReadOutlined style={{ color: '#52c41a' }} />
          <Text>{record.subject_name}</Text>
        </Space>
      ),
      sorter: (a, b) => (a.subject_name || '').localeCompare(b.subject_name || ''),
    },
    {
      title: 'Teacher',
      dataIndex: 'teacher_name',
      key: 'teacher',
      render: (name) => name || '-',
    },
    {
      title: 'Session',
      dataIndex: 'session_name',
      key: 'session',
      render: (name) => (
        <Tag icon={<CalendarOutlined />} color="blue">
          {name || '-'}
        </Tag>
      ),
    },
    {
      title: 'Weekly Periods',
      dataIndex: 'weekly_periods',
      key: 'weekly_periods',
      align: 'center',
      render: (periods) => (
        <Tag color="purple">{periods} periods</Tag>
      ),
      sorter: (a, b) => (a.weekly_periods || 0) - (b.weekly_periods || 0),
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
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
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
            title="Delete Assignment"
            description="Are you sure you want to delete this assignment?"
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
      title="Assignments"
      subtitle="Assign teachers to subjects and sections"
      extra={
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Import
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            Add Assignment
          </Button>
        </Space>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Assignments"
              value={assignments.length}
              prefix={<SolutionOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Active Assignments"
              value={activeAssignments}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Weekly Periods"
              value={totalPeriods}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input
            placeholder="Search assignments..."
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
          dataSource={filteredAssignments}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} assignments`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No assignments found"
              >
                <Space>
                  <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
                    Import from Excel
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
                    Add Assignment
                  </Button>
                </Space>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}
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
              {editingAssignment ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="session"
            label="Session"
            rules={[{ required: true, message: 'Please select a session' }]}
          >
            <Select placeholder="Select session" showSearch optionFilterProp="children">
              {sessions.map((session: any) => (
                <Select.Option key={session.id} value={session.id}>
                  {session.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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
            name="subject"
            label="Subject"
            rules={[{ required: true, message: 'Please select a subject' }]}
          >
            <Select placeholder="Select subject" showSearch optionFilterProp="children">
              {subjects.map((subject: any) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="teacher"
            label="Teacher"
            rules={[{ required: true, message: 'Please select a teacher' }]}
          >
            <Select placeholder="Select teacher" showSearch optionFilterProp="children">
              {teachers.map((teacher: any) => (
                <Select.Option key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name} ({teacher.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="weekly_periods"
            label="Weekly Periods"
            rules={[{ required: true, message: 'Please enter weekly periods' }]}
            tooltip="Number of periods per week for this assignment"
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Import Modal */}
      <Modal
        title="Import Assignments"
        open={importModalOpen}
        onCancel={closeImportModal}
        onOk={handleImport}
        okText="Import"
        okButtonProps={{ loading: importMutation.isPending }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Download Template</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Download the Excel template to see the required format
            </Text>
            <br />
            <Button
              icon={<DownloadOutlined />}
              style={{ marginTop: 8 }}
              onClick={() => {
                message.info('Template download would be implemented here');
              }}
            >
              Download Template
            </Button>
          </div>

          <div>
            <Text strong>Branch</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Select branch"
              value={importBranch || undefined}
              onChange={setImportBranch}
            >
              {branches.map((branch: any) => (
                <Select.Option key={branch.id} value={branch.id}>
                  {branch.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>Session</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Select session"
              value={importSession || undefined}
              onChange={setImportSession}
            >
              {sessions.map((session: any) => (
                <Select.Option key={session.id} value={session.id}>
                  {session.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>Excel File</Text>
            <Upload.Dragger
              accept=".xlsx,.xls"
              maxCount={1}
              beforeUpload={(file) => {
                setImportFile(file);
                return false;
              }}
              onRemove={() => setImportFile(null)}
              fileList={importFile ? [importFile as any] : []}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 32, color: '#1677ff' }} />
              </p>
              <p className="ant-upload-text">Click or drag Excel file to upload</p>
              <p className="ant-upload-hint">
                Required columns: grade, section, subject, teacher_code, weekly_periods
              </p>
            </Upload.Dragger>
          </div>
        </Space>
      </Modal>
    </AntdLayout>
  );
}
