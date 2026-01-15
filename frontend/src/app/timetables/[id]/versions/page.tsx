'use client';

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
  Timeline,
  Popconfirm,
  message,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { timetablesApi } from '@/lib/api';

const { Text, Title, Paragraph } = Typography;

interface TimetableVersion {
  id: string;
  version_number: number;
  change_note: string;
  created_by_name: string;
  created_at: string;
  is_current: boolean;
}

export default function TimetableVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const timetableId = params.id as string;

  const { data: timetableData, isLoading: loadingTimetable } = useQuery({
    queryKey: ['timetable', timetableId],
    queryFn: () => timetablesApi.get(timetableId),
  });

  const { data: versionsData, isLoading: loadingVersions } = useQuery({
    queryKey: ['timetable-versions', timetableId],
    queryFn: () => timetablesApi.versions(timetableId),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ versionId, changeNote }: { versionId: string; changeNote: string }) =>
      timetablesApi.restore(timetableId, versionId, { change_note: changeNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', timetableId] });
      queryClient.invalidateQueries({ queryKey: ['timetable-versions', timetableId] });
      message.success('Version restored successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || 'Failed to restore version');
    },
  });

  const timetable = timetableData?.data;
  const versions: TimetableVersion[] = versionsData?.data?.results || versionsData?.data || [];

  const isLoading = loadingTimetable || loadingVersions;

  const handleRestore = (version: TimetableVersion) => {
    restoreMutation.mutate({
      versionId: version.id,
      changeNote: `Restored from version ${version.version_number}`,
    });
  };

  if (isLoading) {
    return (
      <AntdLayout title="Version History">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      </AntdLayout>
    );
  }

  return (
    <AntdLayout
      title="Version History"
      subtitle={timetable?.name}
      extra={
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push(`/timetables/${timetableId}`)}
        >
          Back to Timetable
        </Button>
      }
    >
      {/* Timetable Info */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/timetables/${timetableId}`)}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {timetable?.name}
            </Title>
            <Text type="secondary">
              Current Version: {timetable?.current_version} | Total Versions: {versions.length}
            </Text>
          </div>
        </div>
      </Card>

      {/* Versions Timeline */}
      {versions.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No version history yet"
          >
            <Text type="secondary">Versions are created when you publish the timetable</Text>
          </Empty>
        </Card>
      ) : (
        <Card title={<Space><HistoryOutlined /> Version Timeline</Space>}>
          <Timeline
            mode="left"
            items={versions.map((version) => ({
              color: version.is_current ? 'green' : 'gray',
              dot: version.is_current ? (
                <CheckCircleOutlined style={{ fontSize: 16 }} />
              ) : (
                <ClockCircleOutlined style={{ fontSize: 16 }} />
              ),
              children: (
                <Card
                  size="small"
                  style={{
                    marginBottom: 16,
                    borderLeft: version.is_current ? '3px solid #52c41a' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Space style={{ marginBottom: 8 }}>
                        <Tag color={version.is_current ? 'success' : 'default'}>
                          Version {version.version_number}
                        </Tag>
                        {version.is_current && <Tag color="blue">Current</Tag>}
                      </Space>
                      <Paragraph style={{ margin: 0, marginBottom: 8 }}>
                        {version.change_note || 'No change note'}
                      </Paragraph>
                      <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <UserOutlined /> {version.created_by_name || 'Unknown'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(version.created_at).toLocaleString()}
                        </Text>
                      </Space>
                    </div>
                    {!version.is_current && (
                      <Popconfirm
                        title="Restore Version"
                        description={`Are you sure you want to restore to version ${version.version_number}?`}
                        onConfirm={() => handleRestore(version)}
                        okText="Restore"
                        cancelText="Cancel"
                      >
                        <Button
                          type="primary"
                          ghost
                          icon={<RollbackOutlined />}
                          loading={restoreMutation.isPending}
                        >
                          Restore
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                </Card>
              ),
            }))}
          />
        </Card>
      )}
    </AntdLayout>
  );
}
