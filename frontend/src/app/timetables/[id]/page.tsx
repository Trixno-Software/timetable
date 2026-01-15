'use client';

import { useQuery } from '@tanstack/react-query';
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
  Descriptions,
  Tooltip,
  Dropdown,
} from 'antd';
import {
  ArrowLeftOutlined,
  TableOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  HistoryOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  MoreOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { timetablesApi, sectionsApi, exportsApi } from '@/lib/api';
import { DAY_NAMES, downloadBlob } from '@/lib/utils';
import { message } from 'antd';

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

export default function TimetableViewPage() {
  const params = useParams();
  const router = useRouter();
  const timetableId = params.id as string;

  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['timetable', timetableId],
    queryFn: () => timetablesApi.get(timetableId),
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionsApi.list(),
  });

  const timetable = timetableData?.data;
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

  const handleExport = async (format: string) => {
    try {
      message.loading({ content: 'Preparing export...', key: 'export' });
      const response = await exportsApi.timetable(timetableId, format, 'school');

      // Handle the response - response.data should be a Blob
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], {
            type: format === 'pdf'
              ? 'application/pdf'
              : format === 'xlsx'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv',
          });

      downloadBlob(blob, `${timetable?.name || 'timetable'}.${format}`);
      message.success({ content: 'Export downloaded successfully', key: 'export' });
    } catch (error: any) {
      console.error('Export error:', error);
      message.error({
        content: error.response?.data?.message || 'Export failed. Please try again.',
        key: 'export'
      });
    }
  };

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
                            }}
                          >
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
          <Tooltip title="Export Excel">
            <Button icon={<FileExcelOutlined />} onClick={() => handleExport('xlsx')}>
              Excel
            </Button>
          </Tooltip>
          <Tooltip title="Export PDF">
            <Button icon={<FilePdfOutlined />} onClick={() => handleExport('pdf')}>
              PDF
            </Button>
          </Tooltip>
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
    </AntdLayout>
  );
}
