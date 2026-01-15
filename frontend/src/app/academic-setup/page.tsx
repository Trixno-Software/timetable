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
  Tabs,
  Empty,
  ColorPicker,
  Typography,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  BookOutlined,
  TeamOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { gradesApi, sectionsApi, subjectsApi, branchesApi, shiftsApi } from '@/lib/api';

const { Text } = Typography;

interface Grade {
  id: string;
  branch: string;
  branch_name: string;
  name: string;
  code: string;
  order: number;
  is_active: boolean;
}

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

interface Subject {
  id: string;
  branch: string;
  branch_name: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
}

export default function AcademicSetupPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('grades');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'grade' | 'section' | 'subject'>('grade');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchText, setSearchText] = useState('');

  const [gradeForm] = Form.useForm();
  const [sectionForm] = Form.useForm();
  const [subjectForm] = Form.useForm();

  // Queries
  const { data: gradesData, isLoading: loadingGrades, refetch: refetchGrades } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
  });

  const { data: sectionsData, isLoading: loadingSections, refetch: refetchSections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionsApi.list(),
  });

  const { data: subjectsData, isLoading: loadingSubjects, refetch: refetchSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list(),
  });

  const grades: Grade[] = gradesData?.data?.results || gradesData?.data || [];
  const sections: Section[] = sectionsData?.data?.results || sectionsData?.data || [];
  const subjects: Subject[] = subjectsData?.data?.results || subjectsData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];
  const shifts = shiftsData?.data?.results || shiftsData?.data || [];

  // Mutations for Grades
  const createGradeMutation = useMutation({
    mutationFn: (data: any) => gradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      message.success('Grade created successfully');
      closeDrawer();
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to create grade'),
  });

  const updateGradeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => gradesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      message.success('Grade updated successfully');
      closeDrawer();
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to update grade'),
  });

  const deleteGradeMutation = useMutation({
    mutationFn: (id: string) => gradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      message.success('Grade deleted successfully');
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to delete grade'),
  });

  // Mutations for Sections
  const createSectionMutation = useMutation({
    mutationFn: (data: any) => sectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      message.success('Section created successfully');
      closeDrawer();
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to create section'),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      message.success('Section updated successfully');
      closeDrawer();
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to update section'),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => sectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      message.success('Section deleted successfully');
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to delete section'),
  });

  // Mutations for Subjects
  const createSubjectMutation = useMutation({
    mutationFn: (data: any) => subjectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      message.success('Subject created successfully');
      closeDrawer();
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to create subject'),
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => subjectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      message.success('Subject updated successfully');
      closeDrawer();
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to update subject'),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => subjectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      message.success('Subject deleted successfully');
    },
    onError: (error: any) => message.error(error.response?.data?.message || 'Failed to delete subject'),
  });

  const openDrawer = (type: 'grade' | 'section' | 'subject', item?: any) => {
    setDrawerType(type);
    setEditingItem(item || null);

    if (type === 'grade') {
      if (item) {
        gradeForm.setFieldsValue(item);
      } else {
        gradeForm.resetFields();
        gradeForm.setFieldsValue({ order: grades.length + 1 });
      }
    } else if (type === 'section') {
      if (item) {
        sectionForm.setFieldsValue(item);
      } else {
        sectionForm.resetFields();
        sectionForm.setFieldsValue({ capacity: 40 });
      }
    } else if (type === 'subject') {
      if (item) {
        subjectForm.setFieldsValue({ ...item, color: item.color || '#1677ff' });
      } else {
        subjectForm.resetFields();
        subjectForm.setFieldsValue({ color: '#1677ff' });
      }
    }

    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingItem(null);
    gradeForm.resetFields();
    sectionForm.resetFields();
    subjectForm.resetFields();
  };

  const handleSubmit = async () => {
    if (drawerType === 'grade') {
      const values = await gradeForm.validateFields();
      if (editingItem) {
        updateGradeMutation.mutate({ id: editingItem.id, data: values });
      } else {
        createGradeMutation.mutate(values);
      }
    } else if (drawerType === 'section') {
      const values = await sectionForm.validateFields();
      if (editingItem) {
        updateSectionMutation.mutate({ id: editingItem.id, data: values });
      } else {
        createSectionMutation.mutate(values);
      }
    } else if (drawerType === 'subject') {
      const values = await subjectForm.validateFields();
      const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1677ff';
      if (editingItem) {
        updateSubjectMutation.mutate({ id: editingItem.id, data: { ...values, color } });
      } else {
        createSubjectMutation.mutate({ ...values, color });
      }
    }
  };

  const gradeColumns: ColumnsType<Grade> = [
    {
      title: 'Grade',
      key: 'grade',
      render: (_, record) => (
        <Space>
          <BookOutlined style={{ color: '#1677ff' }} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Branch', dataIndex: 'branch_name', key: 'branch_name', render: (text) => text || '-' },
    { title: 'Order', dataIndex: 'order', key: 'order' },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer('grade', record)} />
          </Tooltip>
          <Popconfirm title="Delete this grade?" onConfirm={() => deleteGradeMutation.mutate(record.id)} okButtonProps={{ danger: true }}>
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sectionColumns: ColumnsType<Section> = [
    {
      title: 'Section',
      key: 'section',
      render: (_, record) => (
        <Space>
          <TeamOutlined style={{ color: '#52c41a' }} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Grade', dataIndex: 'grade_name', key: 'grade_name', render: (text) => text || '-' },
    { title: 'Shift', dataIndex: 'shift_name', key: 'shift_name', render: (text) => text || '-' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity' },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer('section', record)} />
          </Tooltip>
          <Popconfirm title="Delete this section?" onConfirm={() => deleteSectionMutation.mutate(record.id)} okButtonProps={{ danger: true }}>
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const subjectColumns: ColumnsType<Subject> = [
    {
      title: 'Subject',
      key: 'subject',
      render: (_, record) => (
        <Space>
          <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: record.color || '#1677ff' }} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
          </div>
        </Space>
      ),
    },
    { title: 'Branch', dataIndex: 'branch_name', key: 'branch_name', render: (text) => text || '-' },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color) => (
        <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: color || '#1677ff', border: '1px solid #d9d9d9' }} />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openDrawer('subject', record)} />
          </Tooltip>
          <Popconfirm title="Delete this subject?" onConfirm={() => deleteSubjectMutation.mutate(record.id)} okButtonProps={{ danger: true }}>
            <Tooltip title="Delete">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'grades',
      label: (
        <span>
          <BookOutlined />
          Grades
          <Badge count={grades.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Input
              placeholder="Search grades..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchGrades()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('grade')}>Add Grade</Button>
            </Space>
          </div>
          <Table
            columns={gradeColumns}
            dataSource={grades.filter((g) => g.name.toLowerCase().includes(searchText.toLowerCase()))}
            rowKey="id"
            loading={loadingGrades}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No grades yet"><Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('grade')}>Add First Grade</Button></Empty> }}
          />
        </>
      ),
    },
    {
      key: 'sections',
      label: (
        <span>
          <TeamOutlined />
          Sections
          <Badge count={sections.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Input
              placeholder="Search sections..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchSections()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('section')}>Add Section</Button>
            </Space>
          </div>
          <Table
            columns={sectionColumns}
            dataSource={sections.filter((s) => s.name.toLowerCase().includes(searchText.toLowerCase()))}
            rowKey="id"
            loading={loadingSections}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No sections yet"><Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('section')}>Add First Section</Button></Empty> }}
          />
        </>
      ),
    },
    {
      key: 'subjects',
      label: (
        <span>
          <ReadOutlined />
          Subjects
          <Badge count={subjects.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Input
              placeholder="Search subjects..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetchSubjects()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('subject')}>Add Subject</Button>
            </Space>
          </div>
          <Table
            columns={subjectColumns}
            dataSource={subjects.filter((s) => s.name.toLowerCase().includes(searchText.toLowerCase()))}
            rowKey="id"
            loading={loadingSubjects}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: <Empty description="No subjects yet"><Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer('subject')}>Add First Subject</Button></Empty> }}
          />
        </>
      ),
    },
  ];

  const isLoading = createGradeMutation.isPending || updateGradeMutation.isPending ||
    createSectionMutation.isPending || updateSectionMutation.isPending ||
    createSubjectMutation.isPending || updateSubjectMutation.isPending;

  return (
    <AntdLayout title="Academic Setup" subtitle="Manage grades, sections, and subjects for your school">
      <Card>
        <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setSearchText(''); }} items={tabItems} />
      </Card>

      {/* Drawer */}
      <Drawer
        title={
          drawerType === 'grade' ? (editingItem ? 'Edit Grade' : 'Add New Grade') :
          drawerType === 'section' ? (editingItem ? 'Edit Section' : 'Add New Section') :
          (editingItem ? 'Edit Subject' : 'Add New Subject')
        }
        placement="right"
        width={480}
        onClose={closeDrawer}
        open={drawerOpen}
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button type="primary" onClick={handleSubmit} loading={isLoading}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        {drawerType === 'grade' && (
          <Form form={gradeForm} layout="vertical" requiredMark="optional">
            <Form.Item name="branch" label="Branch" rules={[{ required: true, message: 'Please select a branch' }]}>
              <Select placeholder="Select branch">
                {branches.map((b: any) => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="name" label="Grade Name" rules={[{ required: true, message: 'Please enter grade name' }]}>
              <Input placeholder="e.g., Grade 1, Class 10" />
            </Form.Item>
            <Form.Item name="code" label="Grade Code" rules={[{ required: true, message: 'Please enter grade code' }]}>
              <Input placeholder="e.g., G1, C10" />
            </Form.Item>
            <Form.Item name="order" label="Display Order" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Order in which grade appears" />
            </Form.Item>
          </Form>
        )}

        {drawerType === 'section' && (
          <Form form={sectionForm} layout="vertical" requiredMark="optional">
            <Form.Item name="grade" label="Grade" rules={[{ required: true, message: 'Please select a grade' }]}>
              <Select placeholder="Select grade">
                {grades.map((g) => <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="shift" label="Shift" rules={[{ required: true, message: 'Please select a shift' }]}>
              <Select placeholder="Select shift">
                {shifts.map((s: any) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="Section Name" rules={[{ required: true, message: 'Please enter section name' }]}>
                  <Input placeholder="e.g., A, B, C" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="code" label="Section Code" rules={[{ required: true, message: 'Please enter section code' }]}>
                  <Input placeholder="e.g., A, B" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="Number of students" />
            </Form.Item>
          </Form>
        )}

        {drawerType === 'subject' && (
          <Form form={subjectForm} layout="vertical" requiredMark="optional">
            <Form.Item name="branch" label="Branch" rules={[{ required: true, message: 'Please select a branch' }]}>
              <Select placeholder="Select branch">
                {branches.map((b: any) => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="name" label="Subject Name" rules={[{ required: true, message: 'Please enter subject name' }]}>
              <Input placeholder="e.g., Mathematics, English" />
            </Form.Item>
            <Form.Item name="code" label="Subject Code" rules={[{ required: true, message: 'Please enter subject code' }]}>
              <Input placeholder="e.g., MATH, ENG" />
            </Form.Item>
            <Form.Item name="color" label="Subject Color" tooltip="Color used to identify this subject in the timetable">
              <ColorPicker showText />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </AntdLayout>
  );
}
