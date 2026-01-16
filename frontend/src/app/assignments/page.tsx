'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Tabs,
  Divider,
  Spin,
  Alert,
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
  TableOutlined,
  AppstoreOutlined,
  SaveOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { assignmentsApi, sectionsApi, subjectsApi, teachersApi, sessionsApi, branchesApi, gradesApi, authApi } from '@/lib/api';

const { Text, Title } = Typography;

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

interface GridAssignment {
  subject_id: string;
  subject_name: string;
  teacher_id: string | null;
  weekly_periods: number;
  assignment_id: string | null;
  changed: boolean;
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
  const [activeTab, setActiveTab] = useState('table');

  // Grid view state
  const [gridBranch, setGridBranch] = useState<string>('');
  const [gridSession, setGridSession] = useState<string>('');
  const [gridGrade, setGridGrade] = useState<string>('');
  const [gridSection, setGridSection] = useState<string>('');
  const [gridAssignments, setGridAssignments] = useState<GridAssignment[]>([]);
  const [saving, setSaving] = useState(false);

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

  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
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

  // State for bulk creation mode
  const [bulkMode, setBulkMode] = useState(false);
  const [drawerBranch, setDrawerBranch] = useState<string>('');

  // Get current user info
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.me(),
  });

  const currentUser = userData?.data;
  const userBranch = currentUser?.branch;
  const isSchoolAdmin = currentUser?.role === 'school_admin';
  const isBranchAdmin = currentUser?.role === 'branch_admin' || currentUser?.role === 'coordinator';

  const openDrawer = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setBulkMode(false);
      // Find the section to get its branch
      const section = sections.find((s: any) => s.id === assignment.section);
      setDrawerBranch(section?.branch || userBranch || '');
      form.setFieldsValue({
        section: assignment.section,
        subject: assignment.subject,
        teacher: assignment.teacher,
        session: assignment.session,
        weekly_periods: assignment.weekly_periods,
      });
    } else {
      setEditingAssignment(null);
      setBulkMode(true);
      // Auto-select branch for branch admin, empty for school admin
      const branchToSet = isBranchAdmin && userBranch ? userBranch : '';
      setDrawerBranch(branchToSet);
      form.resetFields();
      form.setFieldsValue({ weekly_periods: 5 });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingAssignment(null);
    setBulkMode(false);
    setDrawerBranch('');
    form.resetFields();
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportBranch('');
    setImportSession('');
  };

  const [bulkCreating, setBulkCreating] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAssignment) {
        // Single update for editing
        updateMutation.mutate({ id: editingAssignment.id, data: values });
      } else if (bulkMode) {
        // Bulk creation - use current session for branch
        if (!currentSessionForBranch) {
          message.error('No session found for this branch. Please create a session first.');
          return;
        }

        const sessionId = currentSessionForBranch.id;
        const sectionsToCreate = Array.isArray(values.sections) ? values.sections : [values.sections];
        const subjectsToCreate = Array.isArray(values.subjects) ? values.subjects : [values.subjects];

        const totalAssignments = sectionsToCreate.length * subjectsToCreate.length;

        if (totalAssignments === 0) {
          message.warning('Please select at least one section and one subject');
          return;
        }

        setBulkCreating(true);
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const sectionId of sectionsToCreate) {
          for (const subjectId of subjectsToCreate) {
            // Check if assignment already exists
            const exists = assignments.some(
              (a) => a.section === sectionId && a.subject === subjectId && a.session === sessionId
            );

            if (exists) {
              skippedCount++;
              continue;
            }

            try {
              const assignmentData: any = {
                session: sessionId,
                section: sectionId,
                subject: subjectId,
                weekly_periods: values.weekly_periods,
              };
              // Only include teacher if one was selected
              if (values.teacher) {
                assignmentData.teacher = values.teacher;
              }
              await assignmentsApi.create(assignmentData);
              successCount++;
            } catch (error) {
              errorCount++;
              console.error('Failed to create assignment:', error);
            }
          }
        }

        setBulkCreating(false);
        queryClient.invalidateQueries({ queryKey: ['assignments'] });

        if (successCount > 0) {
          message.success(`${successCount} assignment(s) created successfully`);
        }
        if (skippedCount > 0) {
          message.info(`${skippedCount} assignment(s) skipped (already exist)`);
        }
        if (errorCount > 0) {
          message.error(`${errorCount} assignment(s) failed to create`);
        }

        closeDrawer();
      } else {
        // Single creation (fallback)
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

  const assignments: Assignment[] = useMemo(() => {
    const data = assignmentsData?.data?.results || assignmentsData?.data;
    return Array.isArray(data) ? data : [];
  }, [assignmentsData]);

  const sections = useMemo(() => {
    const data = sectionsData?.data?.results || sectionsData?.data;
    return Array.isArray(data) ? data : [];
  }, [sectionsData]);

  const subjects = useMemo(() => {
    const data = subjectsData?.data?.results || subjectsData?.data;
    return Array.isArray(data) ? data : [];
  }, [subjectsData]);

  const teachers = useMemo(() => {
    const data = teachersData?.data?.results || teachersData?.data;
    return Array.isArray(data) ? data : [];
  }, [teachersData]);

  const sessions = useMemo(() => {
    const data = sessionsData?.data?.results || sessionsData?.data;
    return Array.isArray(data) ? data : [];
  }, [sessionsData]);

  const branches = useMemo(() => {
    const data = branchesData?.data?.results || branchesData?.data;
    return Array.isArray(data) ? data : [];
  }, [branchesData]);

  const grades = useMemo(() => {
    const data = gradesData?.data?.results || gradesData?.data;
    return Array.isArray(data) ? data : [];
  }, [gradesData]);

  // Filter grades by selected branch (memoized to prevent infinite loops)
  const filteredGrades = useMemo(() =>
    gridBranch ? grades.filter((g: any) => g.branch === gridBranch) : [],
    [gridBranch, grades]
  );

  // Filter sections by selected grade
  const filteredSections = useMemo(() =>
    gridGrade ? sections.filter((s: any) => s.grade === gridGrade) : [],
    [gridGrade, sections]
  );

  // Filter sessions by selected branch
  const filteredSessions = useMemo(() =>
    gridBranch ? sessions.filter((s: any) => s.branch === gridBranch) : [],
    [gridBranch, sessions]
  );

  // Filter subjects by selected branch
  const filteredSubjects = useMemo(() =>
    gridBranch ? subjects.filter((s: any) => s.branch === gridBranch) : subjects,
    [gridBranch, subjects]
  );

  // Filter teachers by selected branch
  const filteredTeachers = useMemo(() =>
    gridBranch ? teachers.filter((t: any) => t.branch === gridBranch) : teachers,
    [gridBranch, teachers]
  );

  // Filtered data for drawer based on drawerBranch
  // Note: sections have branch_id (from grade.branch_id), not branch
  const drawerFilteredSections = useMemo(() =>
    drawerBranch ? sections.filter((s: any) => s.branch_id === drawerBranch || s.branch === drawerBranch) : [],
    [drawerBranch, sections]
  );

  const drawerFilteredSubjects = useMemo(() =>
    drawerBranch ? subjects.filter((s: any) => s.branch === drawerBranch) : [],
    [drawerBranch, subjects]
  );

  const drawerFilteredTeachers = useMemo(() =>
    drawerBranch ? teachers.filter((t: any) => t.branch === drawerBranch) : [],
    [drawerBranch, teachers]
  );

  // Get current session for the selected branch (for drawer)
  const currentSessionForBranch = useMemo(() => {
    if (!drawerBranch) return null;
    const branchSessions = sessions.filter((s: any) => s.branch === drawerBranch);
    return branchSessions.find((s: any) => s.is_current) || branchSessions[0] || null;
  }, [drawerBranch, sessions]);

  // Get current session for grid view branch
  const currentSessionForGrid = useMemo(() => {
    if (!gridBranch) return null;
    const branchSessions = sessions.filter((s: any) => s.branch === gridBranch);
    return branchSessions.find((s: any) => s.is_current) || branchSessions[0] || null;
  }, [gridBranch, sessions]);

  // Auto-set gridSession when gridBranch changes
  useEffect(() => {
    if (currentSessionForGrid && !gridSession) {
      setGridSession(currentSessionForGrid.id);
    }
  }, [currentSessionForGrid, gridSession]);

  // Build grid data when section and session are selected
  useEffect(() => {
    if (!gridSection || !gridSession) {
      setGridAssignments([]);
      return;
    }

    const sectionAssignments = assignments.filter(
      (a) => a.section === gridSection && a.session === gridSession
    );

    const gridData: GridAssignment[] = filteredSubjects.map((subject: any) => {
      const existing = sectionAssignments.find((a) => a.subject === subject.id);
      return {
        subject_id: subject.id,
        subject_name: subject.name,
        teacher_id: existing?.teacher || null,
        weekly_periods: existing?.weekly_periods || 0,
        assignment_id: existing?.id || null,
        changed: false,
      };
    });

    setGridAssignments(gridData);
  }, [gridSection, gridSession, assignments, filteredSubjects]);

  // Handle grid cell changes
  const handleGridChange = (subjectId: string, field: 'teacher_id' | 'weekly_periods', value: any) => {
    setGridAssignments((prev) =>
      prev.map((item) =>
        item.subject_id === subjectId
          ? { ...item, [field]: value, changed: true }
          : item
      )
    );
  };

  // Save all grid changes
  const handleSaveGrid = async () => {
    const changedItems = gridAssignments.filter((item) => item.changed && item.teacher_id && item.weekly_periods > 0);

    if (changedItems.length === 0) {
      message.info('No changes to save');
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of changedItems) {
      try {
        const data = {
          section: gridSection,
          session: gridSession,
          subject: item.subject_id,
          teacher: item.teacher_id,
          weekly_periods: item.weekly_periods,
        };

        if (item.assignment_id) {
          await assignmentsApi.update(item.assignment_id, data);
        } else {
          await assignmentsApi.create(data);
        }
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Failed to save assignment:', error);
      }
    }

    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ['assignments'] });

    if (successCount > 0) {
      message.success(`${successCount} assignment(s) saved successfully`);
    }
    if (errorCount > 0) {
      message.error(`${errorCount} assignment(s) failed to save`);
    }
    // Grid data will refresh automatically via the useEffect when assignments query is invalidated
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.section_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.subject_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      a.teacher_name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const activeAssignments = assignments.filter((a) => a.is_active).length;
  const totalPeriods = assignments.reduce((sum, a) => sum + (a.weekly_periods || 0), 0);

  const hasChanges = gridAssignments.some((item) => item.changed);

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

  // Grid view columns
  const gridColumns: ColumnsType<GridAssignment> = [
    {
      title: 'Subject',
      dataIndex: 'subject_name',
      key: 'subject',
      width: 200,
      render: (name, record) => (
        <Space>
          <ReadOutlined style={{ color: '#52c41a' }} />
          <Text strong>{name}</Text>
          {record.changed && <Tag color="orange" style={{ marginLeft: 8 }}>Modified</Tag>}
        </Space>
      ),
    },
    {
      title: 'Teacher',
      key: 'teacher',
      width: 300,
      render: (_, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="Select teacher"
          value={record.teacher_id || undefined}
          onChange={(value) => handleGridChange(record.subject_id, 'teacher_id', value)}
          showSearch
          optionFilterProp="label"
          allowClear
          options={filteredTeachers.map((teacher: any) => ({
            value: teacher.id,
            label: teacher.full_name || `${teacher.first_name} ${teacher.last_name}`.trim(),
          }))}
        />
      ),
    },
    {
      title: 'Weekly Periods',
      key: 'weekly_periods',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <InputNumber
          min={0}
          max={20}
          value={record.weekly_periods}
          onChange={(value) => handleGridChange(record.subject_id, 'weekly_periods', value || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => (
        record.assignment_id ? (
          <Tag color="success" icon={<CheckOutlined />}>Assigned</Tag>
        ) : record.teacher_id && record.weekly_periods > 0 ? (
          <Tag color="warning">New</Tag>
        ) : (
          <Tag color="default">Not Set</Tag>
        )
      ),
    },
  ];

  const renderGridView = () => (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={5}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Branch</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select branch"
              value={gridBranch || undefined}
              onChange={(value) => {
                setGridBranch(value);
                // Auto-select current session for the new branch
                const branchSessions = sessions.filter((s: any) => s.branch === value);
                const currentSession = branchSessions.find((s: any) => s.is_current) || branchSessions[0];
                setGridSession(currentSession?.id || '');
                setGridGrade('');
                setGridSection('');
              }}
              showSearch
              optionFilterProp="children"
            >
              {branches.map((branch: any) => (
                <Select.Option key={branch.id} value={branch.id}>
                  {branch.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Session</Text>
            <Input
              value={currentSessionForGrid?.name || (gridBranch ? 'No session' : 'Select branch')}
              disabled
              style={{ background: '#f5f5f5' }}
            />
          </Col>
          <Col span={5}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Grade</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select grade"
              value={gridGrade || undefined}
              onChange={(value) => {
                setGridGrade(value);
                setGridSection('');
              }}
              disabled={!gridBranch}
              showSearch
              optionFilterProp="children"
            >
              {filteredGrades.map((grade: any) => (
                <Select.Option key={grade.id} value={grade.id}>
                  {grade.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Section</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select section"
              value={gridSection || undefined}
              onChange={setGridSection}
              disabled={!gridGrade}
              showSearch
              optionFilterProp="children"
            >
              {filteredSections.map((section: any) => (
                <Select.Option key={section.id} value={section.id}>
                  {section.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveGrid}
              disabled={!hasChanges}
              loading={saving}
              style={{ marginTop: 22 }}
            >
              Save All Changes
            </Button>
          </Col>
        </Row>
      </Card>

      {!gridSection || !gridSession ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" align="center">
                <Text>Select Branch, Session, Grade, and Section to manage assignments</Text>
                <Text type="secondary">You can assign teachers to all subjects for a section in one go</Text>
              </Space>
            }
          />
        </Card>
      ) : (
        <Card
          title={
            <Space>
              <AppstoreOutlined />
              <span>
                Assignments for{' '}
                {sections.find((s: any) => s.id === gridSection)?.name || 'Section'} - {' '}
                {grades.find((g: any) => g.id === gridGrade)?.name || 'Grade'}
              </span>
            </Space>
          }
          extra={
            hasChanges && (
              <Alert
                message="You have unsaved changes"
                type="warning"
                showIcon
                style={{ margin: 0, padding: '4px 12px' }}
              />
            )
          }
        >
          <Table
            columns={gridColumns}
            dataSource={gridAssignments}
            rowKey="subject_id"
            pagination={false}
            size="middle"
            loading={isLoading}
            rowClassName={(record) => record.changed ? 'ant-table-row-warning' : ''}
          />
        </Card>
      )}
    </div>
  );

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

      {/* Tabs for different views */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'table',
              label: (
                <span>
                  <TableOutlined />
                  Table View
                </span>
              ),
              children: (
                <>
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
                </>
              ),
            },
            {
              key: 'grid',
              label: (
                <span>
                  <AppstoreOutlined />
                  Grid View (Bulk Edit)
                </span>
              ),
              children: renderGridView(),
            },
          ]}
        />
      </Card>

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingAssignment ? 'Edit Assignment' : 'Add New Assignment (Bulk)'}
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
              loading={createMutation.isPending || updateMutation.isPending || bulkCreating}
            >
              {editingAssignment ? 'Update' : bulkCreating ? 'Creating...' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {bulkMode && !editingAssignment && (
            <Alert
              message="Bulk Creation Mode"
              description="Select multiple sections and/or subjects to create assignments in bulk. Teacher is optional - placeholder teachers (like MATH_TEACHER_1) will be created automatically if not selected. Existing assignments will be skipped."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Branch selection - only for school admin in bulk mode */}
          {!editingAssignment && (
            <Form.Item
              label="Branch"
              required
            >
              {isBranchAdmin && userBranch ? (
                <Input
                  value={branches.find((b: any) => b.id === userBranch)?.name || 'Your Branch'}
                  disabled
                  style={{ background: '#f5f5f5' }}
                />
              ) : (
                <Select
                  placeholder="Select branch first"
                  value={drawerBranch || undefined}
                  onChange={(value) => {
                    setDrawerBranch(value);
                    // Clear dependent fields when branch changes
                    form.setFieldsValue({
                      session: undefined,
                      sections: undefined,
                      subjects: undefined,
                      teacher: undefined,
                    });
                  }}
                  showSearch
                  optionFilterProp="children"
                >
                  {branches.map((branch: any) => (
                    <Select.Option key={branch.id} value={branch.id}>
                      {branch.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          )}

          {editingAssignment ? (
            <Form.Item
              name="session"
              label="Session"
              rules={[{ required: true, message: 'Please select a session' }]}
            >
              <Select
                placeholder="Select session"
                showSearch
                optionFilterProp="children"
              >
                {sessions.map((session: any) => (
                  <Select.Option key={session.id} value={session.id}>
                    {session.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item label="Session">
              <Input
                value={currentSessionForBranch?.name || (drawerBranch ? 'No session found' : 'Select branch first')}
                disabled
                style={{ background: '#f5f5f5' }}
              />
              {currentSessionForBranch?.is_current && (
                <Text type="secondary" style={{ fontSize: 12 }}>Current session (auto-selected)</Text>
              )}
            </Form.Item>
          )}

          {editingAssignment ? (
            // Single select for editing
            <>
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
            </>
          ) : (
            // Multi-select for bulk creation - filtered by branch
            <>
              <Form.Item
                name="sections"
                label="Sections"
                rules={[{ required: true, message: 'Please select at least one section' }]}
                tooltip="Select multiple sections to create assignments for all of them"
              >
                <Select
                  mode="multiple"
                  placeholder={drawerBranch ? "Select sections (can select multiple)" : "Select branch first"}
                  showSearch
                  optionFilterProp="children"
                  maxTagCount={3}
                  maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                  disabled={!drawerBranch}
                >
                  {drawerFilteredSections.map((section: any) => (
                    <Select.Option key={section.id} value={section.id}>
                      {section.name} ({section.grade_name})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="subjects"
                label="Subjects"
                rules={[{ required: true, message: 'Please select at least one subject' }]}
                tooltip="Select multiple subjects to assign the same teacher to all of them"
              >
                <Select
                  mode="multiple"
                  placeholder={drawerBranch ? "Select subjects (can select multiple)" : "Select branch first"}
                  showSearch
                  optionFilterProp="children"
                  maxTagCount={3}
                  maxTagPlaceholder={(omittedValues) => `+${omittedValues.length} more`}
                  disabled={!drawerBranch}
                >
                  {drawerFilteredSubjects.map((subject: any) => (
                    <Select.Option key={subject.id} value={subject.id}>
                      {subject.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="teacher"
            label="Teacher"
            tooltip="Optional - Leave empty to create placeholder teacher (e.g., MATH_TEACHER_1)"
          >
            <Select
              placeholder={editingAssignment || drawerBranch ? "Select teacher (optional)" : "Select branch first"}
              showSearch
              optionFilterProp="children"
              allowClear
              disabled={!drawerBranch && !editingAssignment}
            >
              {(editingAssignment ? teachers : drawerFilteredTeachers).map((teacher: any) => (
                <Select.Option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || `${teacher.first_name} ${teacher.last_name}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="weekly_periods"
            label="Weekly Periods"
            rules={[{ required: true, message: 'Please enter weekly periods' }]}
            tooltip="Number of periods per week for each assignment"
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>

          {bulkMode && !editingAssignment && (
            <Form.Item>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Total assignments to create: {' '}
                <Text strong>
                  (selected sections) x (selected subjects)
                </Text>
              </Text>
            </Form.Item>
          )}
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

      <style jsx global>{`
        .ant-table-row-warning {
          background-color: #fffbe6 !important;
        }
        .ant-table-row-warning:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </AntdLayout>
  );
}
