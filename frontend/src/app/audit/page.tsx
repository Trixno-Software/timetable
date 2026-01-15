'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Drawer,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Empty,
  Typography,
  Descriptions,
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { auditApi } from '@/lib/api';

const { Text, Paragraph } = Typography;

interface AuditLog {
  id: string;
  user: string;
  user_name: string;
  action: string;
  model_type: string;
  model_id: string;
  changes: Record<string, any>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'success',
  update: 'processing',
  delete: 'error',
  login: 'purple',
  logout: 'default',
  publish: 'warning',
  restore: 'orange',
};

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', actionFilter, modelFilter],
    queryFn: () => auditApi.logs({
      action: actionFilter || undefined,
      model_type: modelFilter || undefined,
    }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: () => auditApi.summary(),
  });

  const logs: AuditLog[] = logsData?.data?.results || logsData?.data || [];
  const summary = summaryData?.data || {};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.model_type?.toLowerCase().includes(term)
    );
  });

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => (
        <Text type="secondary">{formatDate(date)}</Text>
      ),
      width: 180,
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user',
      render: (name) => <Text strong>{name || 'System'}</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action) => (
        <Tag color={ACTION_COLORS[action] || 'default'}>
          {action?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Model',
      dataIndex: 'model_type',
      key: 'model_type',
      render: (model) => model || '-',
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip) => <Text type="secondary">{ip || '-'}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => setSelectedLog(record)}
        />
      ),
    },
  ];

  return (
    <AntdLayout
      title="Audit Logs"
      subtitle="Track all system changes and user activity"
    >
      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Creates"
              value={summary.creates || 0}
              prefix={<PlusCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Updates"
              value={summary.updates || 0}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Deletes"
              value={summary.deletes || 0}
              prefix={<DeleteOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Logins"
              value={summary.logins || 0}
              prefix={<LoginOutlined />}
              valueStyle={{ color: '#764ba2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Table */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Input
            placeholder="Search logs..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
          <Select
            placeholder="All Actions"
            style={{ width: 150 }}
            value={actionFilter || undefined}
            onChange={setActionFilter}
            allowClear
            options={[
              { value: 'create', label: 'Create' },
              { value: 'update', label: 'Update' },
              { value: 'delete', label: 'Delete' },
              { value: 'login', label: 'Login' },
              { value: 'logout', label: 'Logout' },
              { value: 'publish', label: 'Publish' },
              { value: 'restore', label: 'Restore' },
            ]}
          />
          <Select
            placeholder="All Models"
            style={{ width: 150 }}
            value={modelFilter || undefined}
            onChange={setModelFilter}
            allowClear
            options={[
              { value: 'timetable', label: 'Timetable' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'section', label: 'Section' },
              { value: 'assignment', label: 'Assignment' },
              { value: 'substitution', label: 'Substitution' },
              { value: 'user', label: 'User' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} logs`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No audit logs found"
              >
                <Text type="secondary">Activity will appear here once actions are performed</Text>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title="Audit Log Details"
        placement="right"
        width={600}
        onClose={() => setSelectedLog(null)}
        open={!!selectedLog}
      >
        {selectedLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Timestamp">
                {formatDate(selectedLog.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="User">
                {selectedLog.user_name || 'System'}
              </Descriptions.Item>
              <Descriptions.Item label="Action">
                <Tag color={ACTION_COLORS[selectedLog.action] || 'default'}>
                  {selectedLog.action?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Model">
                {selectedLog.model_type}
              </Descriptions.Item>
              <Descriptions.Item label="Model ID" span={2}>
                <Text code>{selectedLog.model_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="IP Address" span={2}>
                {selectedLog.ip_address || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <Card title="Changes" size="small">
                <pre style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  overflow: 'auto',
                  fontSize: 12,
                }}>
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </Card>
            )}

            {selectedLog.user_agent && (
              <Card title="User Agent" size="small">
                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                  {selectedLog.user_agent}
                </Paragraph>
              </Card>
            )}
          </Space>
        )}
      </Drawer>
    </AntdLayout>
  );
}
