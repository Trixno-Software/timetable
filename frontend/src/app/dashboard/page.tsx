'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Space,
  Button,
  Progress,
  List,
  Avatar,
  Typography,
  Spin,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  ReadOutlined,
  TableOutlined,
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { useAuthStore } from '@/lib/store';
import {
  schoolsApi,
  branchesApi,
  teachersApi,
  gradesApi,
  sectionsApi,
  subjectsApi,
  timetablesApi,
  substitutionsApi,
} from '@/lib/api';

const { Text } = Typography;

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: schoolsData } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolsApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teachersApi.list(),
  });

  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionsApi.list(),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const { data: timetablesData, isLoading: loadingTimetables } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetablesApi.list(),
  });

  const { data: substitutionsData } = useQuery({
    queryKey: ['substitutions-active'],
    queryFn: () => substitutionsApi.active(),
  });

  const schools = schoolsData?.data?.results || schoolsData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];
  const teachers = teachersData?.data?.results || teachersData?.data || [];
  const grades = gradesData?.data?.results || gradesData?.data || [];
  const sections = sectionsData?.data?.results || sectionsData?.data || [];
  const subjects = subjectsData?.data?.results || subjectsData?.data || [];
  const timetablesRaw = timetablesData?.data?.results || timetablesData?.data;
  const timetables = Array.isArray(timetablesRaw) ? timetablesRaw : [];
  const activeSubstitutions = substitutionsData?.data?.results || substitutionsData?.data || [];

  const quickActions = [
    {
      title: 'Generate Timetable',
      description: 'Create a new timetable',
      icon: <TableOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      onClick: () => router.push('/timetables'),
      color: '#e6f4ff',
    },
    {
      title: 'Add Teacher',
      description: 'Add new teacher',
      icon: <TeamOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      onClick: () => router.push('/teachers'),
      color: '#f6ffed',
    },
    {
      title: 'Substitutions',
      description: 'Manage substitutes',
      icon: <SyncOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      onClick: () => router.push('/substitutions'),
      color: '#fff7e6',
    },
    {
      title: 'Export Reports',
      description: 'Download reports',
      icon: <CalendarOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      onClick: () => router.push('/exports'),
      color: '#f9f0ff',
    },
  ];

  const recentTimetables = timetables.slice(0, 5).map((tt: any) => ({
    key: tt.id,
    name: tt.name,
    status: tt.status,
    branch: tt.branch_name,
    updatedAt: tt.updated_at ? new Date(tt.updated_at).toLocaleDateString() : '-',
  }));

  const timetableColumns = [
    {
      title: 'Timetable',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'default'}>
          {status || 'draft'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => router.push(`/timetables/${record.key}`)}>
          View <ArrowRightOutlined />
        </Button>
      ),
    },
  ];

  return (
    <AntdLayout
      title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'User'}!`}
      subtitle="Here's what's happening with your ScheduleX dashboard today."
    >
      {/* Statistics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card hoverable onClick={() => router.push('/schools')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="Schools"
              value={schools.length}
              prefix={<BankOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card hoverable onClick={() => router.push('/branches')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="Branches"
              value={branches.length}
              prefix={<BankOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card hoverable onClick={() => router.push('/teachers')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="Teachers"
              value={teachers.length}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6} lg={6}>
          <Card hoverable onClick={() => router.push('/sections')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="Sections"
              value={sections.length}
              prefix={<ReadOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12} lg={8}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Academic Overview</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <Text type="secondary">Grades</Text>
                <Text strong>{grades.length}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <Text type="secondary">Subjects</Text>
                <Text strong>{subjects.length}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <Text type="secondary">Active Timetables</Text>
                <Text strong>{timetables.filter((t: any) => t.status === 'published').length}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <Text type="secondary">Active Substitutions</Text>
                <Text strong style={{ color: activeSubstitutions.length > 0 ? '#fa8c16' : undefined }}>
                  {activeSubstitutions.length}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={16}>
          <Card title="Quick Actions">
            <Row gutter={[16, 16]}>
              {quickActions.map((action, index) => (
                <Col xs={12} sm={12} md={6} key={index}>
                  <Card
                    className="quick-action-card"
                    onClick={action.onClick}
                    style={{ background: action.color, border: 'none', textAlign: 'center', cursor: 'pointer' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Space direction="vertical" size={8}>
                      {action.icon}
                      <Text strong style={{ fontSize: 13 }}>{action.title}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Recent Timetables & Active Substitutions */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="Recent Timetables"
            extra={
              <Button type="link" onClick={() => router.push('/timetables')}>
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            {loadingTimetables ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : recentTimetables.length > 0 ? (
              <Table
                columns={timetableColumns}
                dataSource={recentTimetables}
                pagination={false}
                size="small"
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No timetables yet"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/timetables')}>
                  Create Timetable
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="Active Substitutions"
            extra={
              <Button type="link" onClick={() => router.push('/substitutions')}>
                Manage <ArrowRightOutlined />
              </Button>
            }
          >
            {activeSubstitutions.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={activeSubstitutions.slice(0, 5)}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<SyncOutlined />} style={{ backgroundColor: '#fa8c16' }} />}
                      title={
                        <Space>
                          <Text>{item.original_teacher_name}</Text>
                          <ArrowRightOutlined style={{ fontSize: 12 }} />
                          <Text>{item.substitute_teacher_name}</Text>
                        </Space>
                      }
                      description={
                        <Space size={4}>
                          <Text type="secondary">{item.section_name}</Text>
                          <Text type="secondary">|</Text>
                          <Text type="secondary">{item.start_date}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No active substitutions"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Setup Progress (for new users) */}
      {(grades.length === 0 || teachers.length === 0 || sections.length === 0) && (
        <Card title="Setup Progress" style={{ marginTop: 24 }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Grades</Text>
                  {grades.length > 0 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <Button type="link" size="small" onClick={() => router.push('/grades')}>
                      Add
                    </Button>
                  )}
                </div>
                <Progress percent={grades.length > 0 ? 100 : 0} showInfo={false} size="small" />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Teachers</Text>
                  {teachers.length > 0 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <Button type="link" size="small" onClick={() => router.push('/teachers')}>
                      Add
                    </Button>
                  )}
                </div>
                <Progress percent={teachers.length > 0 ? 100 : 0} showInfo={false} size="small" />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Sections</Text>
                  {sections.length > 0 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <Button type="link" size="small" onClick={() => router.push('/sections')}>
                      Add
                    </Button>
                  )}
                </div>
                <Progress percent={sections.length > 0 ? 100 : 0} showInfo={false} size="small" />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Subjects</Text>
                  {subjects.length > 0 ? (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <Button type="link" size="small" onClick={() => router.push('/subjects')}>
                      Add
                    </Button>
                  )}
                </div>
                <Progress percent={subjects.length > 0 ? 100 : 0} showInfo={false} size="small" />
              </Space>
            </Col>
          </Row>
        </Card>
      )}
    </AntdLayout>
  );
}
