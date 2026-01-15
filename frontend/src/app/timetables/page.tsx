'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Tag,
  Drawer,
  Form,
  Input,
  Select,
  Checkbox,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Typography,
  Dropdown,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  TableOutlined,
  DownloadOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  MoreOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { timetablesApi, sessionsApi, shiftsApi, seasonsApi, branchesApi, exportsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';

const { Text, Title } = Typography;

interface Timetable {
  id: string;
  name: string;
  description: string;
  status: string;
  session_name: string;
  shift_name: string;
  season_name: string;
  branch_name: string;
  current_version: number;
  version_count: number;
  created_at: string;
  published_at: string;
}

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 },
];

export default function TimetablesPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [changeNote, setChangeNote] = useState('');

  const { data: timetablesData, isLoading, refetch } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetablesApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list(),
  });

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonsApi.list(),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => timetablesApi.generate(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
      const data = response.data;
      if (data.success) {
        message.success(`Timetable generated successfully! ${data.statistics?.filled || 0} slots filled.`);
      } else {
        message.warning(`Timetable created with ${data.conflicts?.length || 0} conflicts`);
      }
      setDrawerOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      const errorMessage = errorData?.errors?.[0]
        || errorData?.message
        || errorData?.detail
        || (typeof errorData === 'string' ? errorData : null)
        || 'Failed to generate timetable';
      message.error(errorMessage);
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => timetablesApi.publish(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetables'] });
      message.success('Timetable published successfully');
      setPublishModalOpen(false);
      setSelectedTimetable(null);
      setChangeNote('');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Failed to publish');
    },
  });

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      generateMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePublish = () => {
    if (selectedTimetable && changeNote) {
      publishMutation.mutate({ id: selectedTimetable.id, data: { change_note: changeNote } });
    } else {
      message.warning('Please enter a change note');
    }
  };

  const handleExport = async (id: string, format: string) => {
    try {
      const response = await exportsApi.timetable(id, format, 'school');
      downloadBlob(response.data, `timetable.${format}`);
      message.success('Export downloaded');
    } catch (error) {
      message.error('Export failed');
    }
  };

  const openPublishModal = (timetable: Timetable) => {
    setSelectedTimetable(timetable);
    setPublishModalOpen(true);
  };

  const timetablesRaw = timetablesData?.data?.results || timetablesData?.data;
  const timetables: Timetable[] = Array.isArray(timetablesRaw) ? timetablesRaw : [];
  const branchesRaw = branchesData?.data?.results || branchesData?.data;
  const branches = Array.isArray(branchesRaw) ? branchesRaw : [];
  const sessionsRaw = sessionsData?.data?.results || sessionsData?.data;
  const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : [];
  const shiftsRaw = shiftsData?.data?.results || shiftsData?.data;
  const shifts = Array.isArray(shiftsRaw) ? shiftsRaw : [];
  const seasonsRaw = seasonsData?.data?.results || seasonsData?.data;
  const seasons = Array.isArray(seasonsRaw) ? seasonsRaw : [];

  const publishedCount = timetables.filter((t) => t.status === 'published').length;
  const draftCount = timetables.filter((t) => t.status === 'draft').length;

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

  const getDropdownItems = (timetable: Timetable) => [
    {
      key: 'view',
      label: 'View Details',
      icon: <EyeOutlined />,
      onClick: () => router.push(`/timetables/${timetable.id}`),
    },
    {
      key: 'excel',
      label: 'Export Excel',
      icon: <FileExcelOutlined />,
      onClick: () => handleExport(timetable.id, 'xlsx'),
    },
    {
      key: 'pdf',
      label: 'Export PDF',
      icon: <FilePdfOutlined />,
      onClick: () => handleExport(timetable.id, 'pdf'),
    },
    {
      key: 'history',
      label: `Version History (${timetable.version_count})`,
      icon: <HistoryOutlined />,
      onClick: () => router.push(`/timetables/${timetable.id}/versions`),
    },
  ];

  return (
    <AntdLayout
      title="Timetables"
      subtitle="Generate and manage timetables"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setDrawerOpen(true)}>
            Generate Timetable
          </Button>
        </Space>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Timetables"
              value={timetables.length}
              prefix={<TableOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Published"
              value={publishedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Draft"
              value={draftCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Timetables Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="ant-spin ant-spin-spinning">
            <span className="ant-spin-dot ant-spin-dot-spin">
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
            </span>
          </div>
        </div>
      ) : timetables.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No timetables yet"
          >
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setDrawerOpen(true)}>
              Generate Your First Timetable
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {timetables.map((timetable) => (
            <Col xs={24} lg={12} key={timetable.id}>
              <Card
                hoverable
                onClick={() => router.push(`/timetables/${timetable.id}`)}
                extra={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown menu={{ items: getDropdownItems(timetable) }} trigger={['click']}>
                      <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                  </div>
                }
              >
                <div style={{ display: 'flex', gap: 16 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      backgroundColor: timetable.status === 'published' ? '#f6ffed' : '#fffbe6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <TableOutlined
                      style={{
                        fontSize: 28,
                        color: timetable.status === 'published' ? '#52c41a' : '#faad14',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Title level={5} style={{ margin: 0 }} ellipsis>
                        {timetable.name}
                      </Title>
                      <Tag color={getStatusColor(timetable.status)}>
                        {timetable.status?.toUpperCase()}
                      </Tag>
                    </div>
                    {timetable.description && (
                      <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 8 }}>
                        {timetable.description}
                      </Text>
                    )}
                    <Space wrap size={[8, 4]}>
                      <Tag icon={<HomeOutlined />}>{timetable.branch_name}</Tag>
                      <Tag icon={<CalendarOutlined />}>{timetable.session_name}</Tag>
                      <Tag icon={<ClockCircleOutlined />}>{timetable.shift_name}</Tag>
                      {timetable.season_name && <Tag>{timetable.season_name}</Tag>}
                    </Space>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Version {timetable.current_version} | Created {new Date(timetable.created_at).toLocaleDateString()}
                      </Text>
                      <Space onClick={(e) => e.stopPropagation()}>
                        {timetable.status === 'draft' && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => openPublishModal(timetable)}
                          >
                            Publish
                          </Button>
                        )}
                        <Tooltip title="Export Excel">
                          <Button
                            size="small"
                            icon={<FileExcelOutlined />}
                            onClick={() => handleExport(timetable.id, 'xlsx')}
                          />
                        </Tooltip>
                        <Tooltip title="Export PDF">
                          <Button
                            size="small"
                            icon={<FilePdfOutlined />}
                            onClick={() => handleExport(timetable.id, 'pdf')}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Generate Drawer */}
      <Drawer
        title="Generate New Timetable"
        placement="right"
        width={520}
        onClose={() => {
          setDrawerOpen(false);
          form.resetFields();
        }}
        open={drawerOpen}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleGenerate}
              loading={generateMutation.isPending}
              icon={<PlayCircleOutlined />}
            >
              Generate
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ working_days: [0, 1, 2, 3, 4, 5] }}
        >
          <Form.Item
            name="name"
            label="Timetable Name"
            rules={[{ required: true, message: 'Please enter timetable name' }]}
          >
            <Input placeholder="e.g., Morning Shift - Summer 2025" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>

          <Form.Item
            name="branch_id"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="session_id"
                label="Session"
                rules={[{ required: true, message: 'Please select a session' }]}
              >
                <Select placeholder="Select session">
                  {sessions.map((session: any) => (
                    <Select.Option key={session.id} value={session.id}>
                      {session.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shift_id"
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
            </Col>
          </Row>

          <Form.Item name="season_id" label="Season (Optional)">
            <Select placeholder="Select season (optional)" allowClear>
              {seasons.map((season: any) => (
                <Select.Option key={season.id} value={season.id}>
                  {season.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="working_days"
            label="Working Days"
            rules={[{ required: true, message: 'Please select working days' }]}
          >
            <Checkbox.Group options={DAYS_OF_WEEK} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Publish Modal */}
      <Modal
        title="Publish Timetable"
        open={publishModalOpen}
        onCancel={() => {
          setPublishModalOpen(false);
          setSelectedTimetable(null);
          setChangeNote('');
        }}
        onOk={handlePublish}
        okText="Publish"
        okButtonProps={{ loading: publishMutation.isPending }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">
              Publishing "{selectedTimetable?.name}" will create a new version and make it active.
            </Text>
          </div>
          <div>
            <Text strong>Change Note</Text>
            <Input.TextArea
              rows={3}
              placeholder="Describe what changed in this version..."
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>
    </AntdLayout>
  );
}
