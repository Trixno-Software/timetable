'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  Button,
  Space,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Radio,
  Divider,
  Alert,
  List,
  Spin,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  TeamOutlined,
  BankOutlined,
  BookOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { exportsApi, timetablesApi, teachersApi, sectionsApi, gradesApi, branchesApi } from '@/lib/api';

const { Text, Title, Paragraph } = Typography;

type ExportScope = 'school' | 'grade' | 'section' | 'teacher';
type ExportFormat = 'pdf' | 'xlsx' | 'csv';

export default function ExportsPage() {
  const [selectedTimetable, setSelectedTimetable] = useState('');
  const [selectedScope, setSelectedScope] = useState<ExportScope>('school');
  const [selectedScopeId, setSelectedScopeId] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');

  const { data: timetablesData, isLoading: loadingTimetables } = useQuery({
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

  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await exportsApi.timetable(
        selectedTimetable,
        selectedFormat,
        selectedScope,
        selectedScopeId || undefined
      );
      return response;
    },
    onSuccess: (response) => {
      try {
        // Response.data should already be a Blob when using responseType: 'blob'
        const blob = response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: selectedFormat === 'pdf'
                ? 'application/pdf'
                : selectedFormat === 'xlsx'
                  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  : 'text/csv',
            });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timetableName = timetables.find((t: any) => t.id === selectedTimetable)?.name || 'timetable';
        a.download = `${timetableName}-${selectedScope}${selectedScopeId ? `-${selectedScopeId}` : ''}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Export downloaded successfully');
      } catch (err) {
        console.error('Download error:', err);
        message.error('Failed to download the file');
      }
    },
    onError: (error: any) => {
      console.error('Export error:', error);
      message.error(error.response?.data?.message || error.message || 'Failed to export timetable');
    },
  });

  const templateMutation = useMutation({
    mutationFn: (templateType: string) => exportsApi.template(templateType),
    onSuccess: (response, templateType) => {
      try {
        const blob = response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateType}-template.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Template downloaded successfully');
      } catch (err) {
        console.error('Download error:', err);
        message.error('Failed to download the template');
      }
    },
    onError: (error: any) => {
      console.error('Template error:', error);
      message.error(error.response?.data?.message || error.message || 'Failed to download template');
    },
  });

  const handleExport = () => {
    if (!selectedTimetable) {
      message.error('Please select a timetable');
      return;
    }
    exportMutation.mutate();
  };

  const timetablesRaw = timetablesData?.data?.results || timetablesData?.data;
  const timetables = Array.isArray(timetablesRaw) ? timetablesRaw : [];
  const teachersRaw = teachersData?.data?.results || teachersData?.data;
  const teachers = Array.isArray(teachersRaw) ? teachersRaw : [];
  const sectionsRaw = sectionsData?.data?.results || sectionsData?.data;
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const gradesRaw = gradesData?.data?.results || gradesData?.data;
  const grades = Array.isArray(gradesRaw) ? gradesRaw : [];
  const branchesRaw = branchesData?.data?.results || branchesData?.data;
  const branches = Array.isArray(branchesRaw) ? branchesRaw : [];

  const getScopeOptions = () => {
    switch (selectedScope) {
      case 'teacher':
        return teachers.map((t: any) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }));
      case 'section':
        return sections.map((s: any) => ({ value: s.id, label: `${s.name} (${s.grade_name})` }));
      case 'grade':
        return grades.map((g: any) => ({ value: g.id, label: g.name }));
      case 'school':
        return branches.map((b: any) => ({ value: b.id, label: b.name }));
      default:
        return [];
    }
  };

  const scopeOptions = [
    { value: 'school', label: 'School/Branch', icon: <BankOutlined /> },
    { value: 'grade', label: 'Grade', icon: <BookOutlined /> },
    { value: 'section', label: 'Section', icon: <TeamOutlined /> },
    { value: 'teacher', label: 'Teacher', icon: <UserOutlined /> },
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: <FilePdfOutlined /> },
    { value: 'xlsx', label: 'Excel', icon: <FileExcelOutlined /> },
    { value: 'csv', label: 'CSV', icon: <FileTextOutlined /> },
  ];

  const templateItems = [
    {
      title: 'Teachers Template',
      description: 'Import teachers with codes and details',
      key: 'teachers',
    },
    {
      title: 'Sections Template',
      description: 'Import grades and sections',
      key: 'sections',
    },
    {
      title: 'Assignments Template',
      description: 'Import teacher-subject assignments',
      key: 'assignments',
    },
  ];

  return (
    <AntdLayout
      title="Export Center"
      subtitle="Download timetables and import templates"
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Timetables"
              value={timetables.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Teachers"
              value={teachers.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Sections"
              value={sections.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Grades"
              value={grades.length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Export Timetable Card */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <DownloadOutlined style={{ color: '#764ba2' }} />
                <span>Export Timetable</span>
              </Space>
            }
          >
            {loadingTimetables ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : timetables.length === 0 ? (
              <Alert
                message="No Timetables Available"
                description="Create and publish a timetable first before exporting."
                type="info"
                showIcon
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Timetable Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Select Timetable
                  </Text>
                  <Select
                    placeholder="Select a timetable"
                    style={{ width: '100%' }}
                    value={selectedTimetable || undefined}
                    onChange={setSelectedTimetable}
                    options={timetables.map((tt: any) => ({
                      value: tt.id,
                      label: (
                        <Space>
                          <span>{tt.name}</span>
                          {tt.status === 'published' && (
                            <span style={{ color: '#52c41a', fontSize: 12 }}>Published</span>
                          )}
                        </Space>
                      ),
                    }))}
                  />
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Scope Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Export Scope
                  </Text>
                  <Radio.Group
                    value={selectedScope}
                    onChange={(e) => {
                      setSelectedScope(e.target.value);
                      setSelectedScopeId('');
                    }}
                    optionType="button"
                    buttonStyle="solid"
                  >
                    {scopeOptions.map((opt) => (
                      <Radio.Button key={opt.value} value={opt.value}>
                        <Space>
                          {opt.icon}
                          {opt.label}
                        </Space>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                {/* Scope ID Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Select {selectedScope.charAt(0).toUpperCase() + selectedScope.slice(1)} (Optional)
                  </Text>
                  <Select
                    placeholder={`All ${selectedScope}s`}
                    style={{ width: '100%' }}
                    value={selectedScopeId || undefined}
                    onChange={setSelectedScopeId}
                    allowClear
                    options={getScopeOptions()}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    Leave empty to export all {selectedScope}s
                  </Text>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Format Selection */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Export Format
                  </Text>
                  <Radio.Group
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                  >
                    {formatOptions.map((opt) => (
                      <Radio.Button key={opt.value} value={opt.value}>
                        <Space>
                          {opt.icon}
                          {opt.label}
                        </Space>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </div>

                {/* Export Button */}
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  size="large"
                  block
                  onClick={handleExport}
                  loading={exportMutation.isPending}
                  disabled={!selectedTimetable}
                >
                  {exportMutation.isPending ? 'Exporting...' : 'Export Timetable'}
                </Button>
              </Space>
            )}
          </Card>
        </Col>

        {/* Import Templates Card */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <FileExcelOutlined style={{ color: '#52c41a' }} />
                <span>Import Templates</span>
              </Space>
            }
          >
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Download Excel templates to bulk import data into the system.
            </Paragraph>

            <List
              itemLayout="horizontal"
              dataSource={templateItems}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="download"
                      icon={<DownloadOutlined />}
                      onClick={() => templateMutation.mutate(item.key)}
                      loading={templateMutation.isPending}
                    >
                      Download
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />}
                    title={item.title}
                    description={item.description}
                  />
                </List.Item>
              )}
            />

            <Divider />

            <Alert
              message="How to use templates"
              description={
                <ol style={{ paddingLeft: 20, margin: 0 }}>
                  <li>Download the appropriate template</li>
                  <li>Fill in your data following the column headers</li>
                  <li>Go to the respective page (Teachers, Assignments, etc.)</li>
                  <li>Click Import and upload your filled template</li>
                </ol>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </AntdLayout>
  );
}
