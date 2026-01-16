'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Space,
  Tag,
  Empty,
  Typography,
  Spin,
  Tabs,
  Tooltip,
  Modal,
  Form,
  Select,
  DatePicker,
  Table,
  Alert,
  Input,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  TableOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  HistoryOutlined,
  EditOutlined,
  UserDeleteOutlined,
  SwapOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { timetablesApi, sectionsApi, subjectsApi, teachersApi, timetableEntriesApi, substitutionsApi } from '@/lib/api';
import { DAY_NAMES } from '@/lib/utils';

const { Text, Title } = Typography;

interface TimetableEntry {
  id: string;
  section: string;
  section_name: string;
  day_of_week: number;
  day_name: string;
  period_number: number;
  period_name: string;
  subject: string;
  subject_name: string;
  subject_color: string;
  teacher: string;
  teacher_name: string;
}

interface EditingEntry {
  id: string;
  section: string;
  section_name: string;
  day_of_week: number;
  day_name: string;
  period_number: number;
  period_slot: string;
  subject: string;
  subject_name: string;
  teacher: string;
  teacher_name: string;
}

interface TeacherScheduleEntry {
  id: string;
  section_name: string;
  subject_name: string;
  period_number: number;
  day_of_week: number;
}

interface AvailableTeacher {
  id: string;
  name: string;
  employee_id: string;
  is_free_all_periods: boolean;
  busy_periods: Array<{ period_number: number; section: string; subject: string }>;
  free_period_count: number;
}

interface SubstitutionAssignment {
  period_number: number;
  substitute_teacher_id: string;
}

export default function TimetableViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const timetableId = params.id as string;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [editForm] = Form.useForm();

  // Mark Teacher Absent state
  const [absentModalOpen, setAbsentModalOpen] = useState(false);
  const [selectedAbsentTeacher, setSelectedAbsentTeacher] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [absentReason, setAbsentReason] = useState('');
  const [substitutionAssignments, setSubstitutionAssignments] = useState<Record<number, string>>({});

  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['timetable', timetableId],
    queryFn: () => timetablesApi.get(timetableId),
  });

  const timetable = timetableData?.data;
  const branchId = timetable?.branch;

  const { data: sectionsData } = useQuery({
    queryKey: ['sections', branchId],
    queryFn: () => sectionsApi.list({ branch: branchId }),
    enabled: !!branchId,
  });

  // Fetch subjects filtered by timetable's branch for optimization
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', branchId],
    queryFn: () => subjectsApi.list({ branch: branchId }),
    enabled: !!branchId,
  });

  // Fetch teachers filtered by timetable's branch for optimization
  const { data: teachersData } = useQuery({
    queryKey: ['teachers', branchId],
    queryFn: () => teachersApi.list({ branch: branchId }),
    enabled: !!branchId,
  });

  // Get day of week from selected date (0 = Monday in our system)
  const selectedDayOfWeek = selectedDate ? (selectedDate.day() === 0 ? 6 : selectedDate.day() - 1) : 0;

  // Fetch absent teacher's schedule for the selected day
  const { data: teacherScheduleData, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['teacherSchedule', timetableId, selectedAbsentTeacher, selectedDayOfWeek],
    queryFn: () => substitutionsApi.teacherSchedule(timetableId, selectedAbsentTeacher!, selectedDayOfWeek),
    enabled: !!timetableId && !!selectedAbsentTeacher && absentModalOpen,
  });

  // Get period numbers from schedule
  const teacherSchedule: TeacherScheduleEntry[] = teacherScheduleData?.data || [];
  const periodNumbers = teacherSchedule.map((s) => s.period_number);

  // Fetch available teachers for those periods
  const { data: availableTeachersData, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['availableTeachers', timetableId, selectedDayOfWeek, periodNumbers.join(',')],
    queryFn: () => substitutionsApi.availableTeachers(timetableId, selectedDayOfWeek, periodNumbers),
    enabled: !!timetableId && periodNumbers.length > 0 && absentModalOpen,
  });

  const availableTeachers: AvailableTeacher[] = availableTeachersData?.data || [];

  // Mark absent mutation
  const markAbsentMutation = useMutation({
    mutationFn: (data: {
      timetable_id: string;
      absent_teacher_id: string;
      date: string;
      day_of_week: number;
      substitutions: SubstitutionAssignment[];
      reason?: string;
    }) => substitutionsApi.markAbsent(data),
    onSuccess: (response) => {
      const count = response.data?.substitutions?.length || 0;
      message.success(`Created ${count} substitution(s) successfully`);
      setAbsentModalOpen(false);
      resetAbsentForm();
      queryClient.invalidateQueries({ queryKey: ['timetable', timetableId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Failed to create substitutions');
    },
  });

  const resetAbsentForm = () => {
    setSelectedAbsentTeacher(null);
    setSelectedDate(dayjs());
    setAbsentReason('');
    setSubstitutionAssignments({});
  };

  const handleMarkAbsentSubmit = () => {
    if (!selectedAbsentTeacher || !selectedDate) {
      message.error('Please select a teacher and date');
      return;
    }

    const substitutions: SubstitutionAssignment[] = Object.entries(substitutionAssignments)
      .filter(([_, teacherId]) => teacherId)
      .map(([periodNum, teacherId]) => ({
        period_number: parseInt(periodNum),
        substitute_teacher_id: teacherId,
      }));

    if (substitutions.length === 0) {
      message.error('Please assign at least one substitute teacher');
      return;
    }

    markAbsentMutation.mutate({
      timetable_id: timetableId,
      absent_teacher_id: selectedAbsentTeacher,
      date: selectedDate.format('YYYY-MM-DD'),
      day_of_week: selectedDayOfWeek,
      substitutions,
      reason: absentReason || 'Teacher absent',
    });
  };

  // Get teachers who are free for a specific period
  const getFreeTeachersForPeriod = (periodNumber: number) => {
    return availableTeachers.filter((t) => {
      const isBusy = t.busy_periods.some((bp) => bp.period_number === periodNumber);
      return !isBusy && t.id !== selectedAbsentTeacher;
    });
  };

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      timetableEntriesApi.update(id, data),
    onSuccess: () => {
      message.success('Period updated successfully');
      queryClient.invalidateQueries({ queryKey: ['timetable', timetableId] });
      setEditModalOpen(false);
      setEditingEntry(null);
      editForm.resetFields();
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      // Handle detailed conflict message from details.message
      const detailMessage = errorData?.details?.message;

      if (detailMessage && Array.isArray(detailMessage) && detailMessage.length > 0) {
        message.error(detailMessage[0], 5); // Show for 5 seconds
      } else if (detailMessage && typeof detailMessage === 'string') {
        message.error(detailMessage, 5);
      } else if (errorData?.message && errorData.message !== 'Invalid request') {
        message.error(errorData.message, 5);
      } else if (errorData?.conflicts) {
        message.error(`Conflict: ${errorData.conflicts.join(', ')}`, 5);
      } else {
        message.error('Failed to update period');
      }
    },
  });

  const subjects = subjectsData?.data?.results || subjectsData?.data || [];
  const teachers = teachersData?.data?.results || teachersData?.data || [];

  const entriesRaw = timetable?.entries;
  const entries: TimetableEntry[] = Array.isArray(entriesRaw) ? entriesRaw : [];
  const sectionsRaw = sectionsData?.data?.results || sectionsData?.data;
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];

  // Group entries by section
  const entriesBySection: Record<string, TimetableEntry[]> = {};
  entries.forEach((entry) => {
    if (!entriesBySection[entry.section]) {
      entriesBySection[entry.section] = [];
    }
    entriesBySection[entry.section].push(entry);
  });

  // Get unique periods
  const periods = [...new Set(entries.map((e) => e.period_number))].sort((a, b) => a - b);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleEditClick = (entry: TimetableEntry) => {
    setEditingEntry({
      id: entry.id,
      section: entry.section,
      section_name: entry.section_name,
      day_of_week: entry.day_of_week,
      day_name: entry.day_name,
      period_number: entry.period_number,
      period_slot: (entry as any).period_slot,
      subject: entry.subject,
      subject_name: entry.subject_name,
      teacher: entry.teacher,
      teacher_name: entry.teacher_name,
    });
    editForm.setFieldsValue({
      subject: entry.subject,
      teacher: entry.teacher,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingEntry) return;
    try {
      const values = await editForm.validateFields();
      updateEntryMutation.mutate({
        id: editingEntry.id,
        data: {
          subject: values.subject,
          teacher: values.teacher,
        },
      });
    } catch {
      // Validation failed
    }
  };

  if (isLoading) {
    return (
      <AntdLayout title="Timetable">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      </AntdLayout>
    );
  }

  if (!timetable) {
    return (
      <AntdLayout title="Timetable">
        <Card>
          <Empty description="Timetable not found">
            <Button type="primary" onClick={() => router.push('/timetables')}>
              Back to Timetables
            </Button>
          </Empty>
        </Card>
      </AntdLayout>
    );
  }

  const renderTimetableGrid = (sectionId: string, sectionEntries: TimetableEntry[]) => {
    const sectionName = sectionEntries[0]?.section_name || 'Unknown Section';

    // Build grid
    const grid: Record<number, Record<number, TimetableEntry>> = {};
    for (let day = 0; day < 6; day++) {
      grid[day] = {};
    }
    sectionEntries.forEach((entry) => {
      grid[entry.day_of_week][entry.period_number] = entry;
    });

    return (
      <Card
        key={sectionId}
        title={
          <Space>
            <TableOutlined />
            <Text strong>{sectionName}</Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 800,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: '1px solid #f0f0f0',
                    backgroundColor: '#fafafa',
                    padding: 12,
                    fontWeight: 500,
                    width: 100,
                  }}
                >
                  Day
                </th>
                {periods.map((period) => (
                  <th
                    key={period}
                    style={{
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fafafa',
                      padding: 12,
                      fontWeight: 500,
                      textAlign: 'center',
                    }}
                  >
                    Period {period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((day) => (
                <tr key={day}>
                  <td
                    style={{
                      border: '1px solid #f0f0f0',
                      backgroundColor: '#fafafa',
                      padding: 12,
                      fontWeight: 500,
                    }}
                  >
                    {DAY_NAMES[day]}
                  </td>
                  {periods.map((period) => {
                    const entry = grid[day][period];
                    return (
                      <td
                        key={period}
                        style={{
                          border: '1px solid #f0f0f0',
                          padding: 4,
                          verticalAlign: 'top',
                        }}
                      >
                        {entry ? (
                          <div
                            style={{
                              borderRadius: 6,
                              padding: 8,
                              textAlign: 'center',
                              backgroundColor: `${entry.subject_color}15`,
                              border: `1px solid ${entry.subject_color}30`,
                              position: 'relative',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleEditClick(entry)}
                          >
                            <Tooltip title="Click to edit">
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  opacity: 0.5,
                                }}
                              >
                                <EditOutlined style={{ fontSize: 10 }} />
                              </div>
                            </Tooltip>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                color: entry.subject_color,
                                marginBottom: 4,
                              }}
                            >
                              {entry.subject_name}
                            </div>
                            <div style={{ fontSize: 11, color: '#666' }}>
                              {entry.teacher_name}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              textAlign: 'center',
                              color: '#d9d9d9',
                              padding: 8,
                              fontSize: 12,
                            }}
                          >
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const sectionTabs = Object.entries(entriesBySection).map(([sectionId, sectionEntries]) => ({
    key: sectionId,
    label: sectionEntries[0]?.section_name || 'Unknown',
    children: renderTimetableGrid(sectionId, sectionEntries),
  }));

  return (
    <AntdLayout
      title={timetable.name}
      subtitle={`${timetable.session_name} | ${timetable.shift_name}${timetable.season_name ? ` | ${timetable.season_name}` : ''}`}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<UserDeleteOutlined />}
            onClick={() => setAbsentModalOpen(true)}
          >
            Mark Teacher Absent
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => router.push(`/timetables/${timetableId}/versions`)}
          >
            History ({timetable.version_count || 0})
          </Button>
        </Space>
      }
    >
      {/* Back button and header info */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/timetables')}
          />
          <div style={{ flex: 1 }}>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Title level={4} style={{ margin: 0 }}>
                {timetable.name}
              </Title>
              <Tag color={getStatusColor(timetable.status)}>
                {timetable.status?.toUpperCase()}
              </Tag>
            </Space>
            {timetable.description && (
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                {timetable.description}
              </Text>
            )}
            <Space wrap size={[8, 8]}>
              <Tag icon={<HomeOutlined />}>{timetable.branch_name}</Tag>
              <Tag icon={<CalendarOutlined />}>{timetable.session_name}</Tag>
              <Tag icon={<ClockCircleOutlined />}>{timetable.shift_name}</Tag>
              {timetable.season_name && <Tag>{timetable.season_name}</Tag>}
              <Tag color="blue">Version {timetable.current_version}</Tag>
            </Space>
          </div>
        </div>
      </Card>

      {/* Timetable grids */}
      {Object.entries(entriesBySection).length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No schedule data"
          >
            <Text type="secondary">This timetable has no entries yet</Text>
          </Empty>
        </Card>
      ) : sectionTabs.length === 1 ? (
        renderTimetableGrid(sectionTabs[0].key, entriesBySection[sectionTabs[0].key])
      ) : (
        <Card>
          <Tabs items={sectionTabs} />
        </Card>
      )}

      {/* Edit Period Modal */}
      <Modal
        title="Edit Period"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingEntry(null);
          editForm.resetFields();
        }}
        onOk={handleEditSave}
        confirmLoading={updateEntryMutation.isPending}
        okText="Save Changes"
      >
        {editingEntry && (
          <>
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <Space direction="vertical" size={4}>
                <Text strong>{editingEntry.section_name}</Text>
                <Text type="secondary">
                  {editingEntry.day_name} - Period {editingEntry.period_number}
                </Text>
              </Space>
            </div>
            <Form form={editForm} layout="vertical">
              <Form.Item
                name="subject"
                label="Subject"
                rules={[{ required: true, message: 'Please select a subject' }]}
              >
                <Select
                  placeholder="Select subject"
                  showSearch
                  optionFilterProp="label"
                  options={subjects.map((subject: any) => ({
                    value: subject.id,
                    label: subject.name,
                  }))}
                  optionRender={(option) => {
                    const subject = subjects.find((s: any) => s.id === option.value);
                    return (
                      <Space>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            backgroundColor: subject?.color || '#1890ff',
                          }}
                        />
                        {option.label}
                      </Space>
                    );
                  }}
                />
              </Form.Item>
              <Form.Item
                name="teacher"
                label="Teacher"
                rules={[{ required: true, message: 'Please select a teacher' }]}
              >
                <Select
                  placeholder="Select teacher"
                  showSearch
                  optionFilterProp="label"
                  options={teachers.map((teacher: any) => ({
                    value: teacher.id,
                    label: teacher.full_name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || teacher.email || 'Unknown',
                  }))}
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Mark Teacher Absent Modal */}
      <Modal
        title={
          <Space>
            <UserDeleteOutlined />
            Mark Teacher Absent
          </Space>
        }
        open={absentModalOpen}
        onCancel={() => {
          setAbsentModalOpen(false);
          resetAbsentForm();
        }}
        width={800}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setAbsentModalOpen(false);
              resetAbsentForm();
            }}
          >
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={markAbsentMutation.isPending}
            onClick={handleMarkAbsentSubmit}
            disabled={!selectedAbsentTeacher || teacherSchedule.length === 0}
          >
            Assign Substitutes
          </Button>,
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Step 1: Select Teacher and Date */}
          <Card size="small" title="Step 1: Select Absent Teacher & Date">
            <Space size="large" wrap>
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Date
                </Text>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date || dayjs());
                    setSubstitutionAssignments({});
                  }}
                  style={{ width: 200 }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
                {selectedDate && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {DAY_NAMES[selectedDayOfWeek]}
                  </Tag>
                )}
              </div>
              <div style={{ minWidth: 300 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Absent Teacher
                </Text>
                <Select
                  placeholder="Select teacher who is absent"
                  value={selectedAbsentTeacher}
                  onChange={(value) => {
                    setSelectedAbsentTeacher(value);
                    setSubstitutionAssignments({});
                  }}
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  options={teachers.map((t: any) => ({
                    value: t.id,
                    label: t.full_name || `${t.first_name} ${t.last_name}`,
                  }))}
                />
              </div>
              <div style={{ minWidth: 200 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                  Reason (Optional)
                </Text>
                <Input
                  placeholder="e.g., Sick leave"
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                />
              </div>
            </Space>
          </Card>

          {/* Step 2: Show Schedule and Assign Substitutes */}
          {selectedAbsentTeacher && (
            <Card size="small" title="Step 2: Assign Substitute Teachers">
              {isLoadingSchedule ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin />
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Loading teacher schedule...
                  </Text>
                </div>
              ) : teacherSchedule.length === 0 ? (
                <Alert
                  type="info"
                  message="No Classes Found"
                  description={`This teacher has no classes scheduled for ${DAY_NAMES[selectedDayOfWeek]}.`}
                />
              ) : (
                <>
                  <Alert
                    type="warning"
                    message={`${teacherSchedule.length} period(s) need substitute teachers`}
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    dataSource={teacherSchedule}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Period',
                        dataIndex: 'period_number',
                        key: 'period_number',
                        width: 80,
                        render: (num: number) => (
                          <Tag color="blue">P{num}</Tag>
                        ),
                      },
                      {
                        title: 'Section',
                        dataIndex: 'section_name',
                        key: 'section_name',
                        width: 150,
                      },
                      {
                        title: 'Subject',
                        dataIndex: 'subject_name',
                        key: 'subject_name',
                        width: 150,
                      },
                      {
                        title: 'Substitute Teacher',
                        key: 'substitute',
                        render: (_: any, record: TeacherScheduleEntry) => {
                          const freeTeachers = getFreeTeachersForPeriod(record.period_number);
                          const assigned = substitutionAssignments[record.period_number];

                          return (
                            <Select
                              placeholder="Select substitute"
                              value={assigned}
                              onChange={(value) => {
                                setSubstitutionAssignments((prev) => ({
                                  ...prev,
                                  [record.period_number]: value,
                                }));
                              }}
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            >
                              {freeTeachers.length > 0 && (
                                <Select.OptGroup label="Free Teachers">
                                  {freeTeachers.map((t) => (
                                    <Select.Option key={t.id} value={t.id} label={t.name}>
                                      <Space>
                                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                        {t.name}
                                      </Space>
                                    </Select.Option>
                                  ))}
                                </Select.OptGroup>
                              )}
                              <Select.OptGroup label="All Teachers">
                                {teachers
                                  .filter((t: any) => t.id !== selectedAbsentTeacher)
                                  .map((t: any) => {
                                    const isFree = freeTeachers.some((ft) => ft.id === t.id);
                                    if (isFree) return null;
                                    const teacherAvail = availableTeachers.find((at) => at.id === t.id);
                                    const isBusy = teacherAvail?.busy_periods.some(
                                      (bp) => bp.period_number === record.period_number
                                    );
                                    return (
                                      <Select.Option
                                        key={t.id}
                                        value={t.id}
                                        label={t.full_name}
                                        disabled={isBusy}
                                      >
                                        <Space>
                                          {isBusy ? (
                                            <SwapOutlined style={{ color: '#ff4d4f' }} />
                                          ) : (
                                            <SwapOutlined style={{ color: '#faad14' }} />
                                          )}
                                          <span style={{ color: isBusy ? '#999' : undefined }}>
                                            {t.full_name || `${t.first_name} ${t.last_name}`}
                                          </span>
                                          {isBusy && (
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                              (Busy)
                                            </Text>
                                          )}
                                        </Space>
                                      </Select.Option>
                                    );
                                  })}
                              </Select.OptGroup>
                            </Select>
                          );
                        },
                      },
                    ]}
                  />
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Text type="secondary">
                      {Object.values(substitutionAssignments).filter(Boolean).length} of{' '}
                      {teacherSchedule.length} periods assigned
                    </Text>
                  </div>
                </>
              )}
            </Card>
          )}
        </Space>
      </Modal>
    </AntdLayout>
  );
}
