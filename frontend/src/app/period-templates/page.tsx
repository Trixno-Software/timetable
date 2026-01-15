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
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Typography,
  TimePicker,
  InputNumber,
  Switch,
  List,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
  HomeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AntdLayout } from '@/components/layout/AntdLayout';
import { periodTemplatesApi, branchesApi, shiftsApi, seasonsApi, gradesApi } from '@/lib/api';

const { Text, Title } = Typography;

interface PeriodSlot {
  id?: string;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_break: boolean;
}

interface PeriodTemplate {
  id: string;
  branch: string;
  branch_name: string;
  shift: string;
  shift_name: string;
  season: string | null;
  season_name: string | null;
  grade: string | null;
  grade_name: string | null;
  name: string;
  is_active: boolean;
  slots: PeriodSlot[];
}

export default function PeriodTemplatesPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PeriodTemplate | null>(null);
  const [slots, setSlots] = useState<PeriodSlot[]>([]);

  const { data: templatesData, isLoading, refetch } = useQuery({
    queryKey: ['period-templates'],
    queryFn: () => periodTemplatesApi.list(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.list(),
  });

  const { data: seasonsData } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonsApi.list(),
  });

  const { data: gradesData } = useQuery({
    queryKey: ['grades'],
    queryFn: () => gradesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => periodTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-templates'] });
      message.success('Period template created successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => periodTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-templates'] });
      message.success('Period template updated successfully');
      closeDrawer();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => periodTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-templates'] });
      message.success('Period template deleted successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete template');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => periodTemplatesApi.duplicate(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-templates'] });
      message.success('Period template duplicated successfully');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to duplicate template');
    },
  });

  const openDrawer = (template?: PeriodTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.setFieldsValue({
        branch: template.branch,
        shift: template.shift,
        season: template.season || undefined,
        grade: template.grade || undefined,
        name: template.name,
      });
      setSlots(template.slots || []);
    } else {
      setEditingTemplate(null);
      form.resetFields();
      setSlots([]);
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingTemplate(null);
    form.resetFields();
    setSlots([]);
  };

  const addSlot = () => {
    const newSlotNumber = slots.length + 1;
    setSlots([
      ...slots,
      {
        period_number: newSlotNumber,
        name: `Period ${newSlotNumber}`,
        start_time: '08:00',
        end_time: '08:45',
        duration_minutes: 45,
        is_break: false,
      },
    ]);
  };

  const removeSlot = (index: number) => {
    const newSlots = slots.filter((_, i) => i !== index).map((slot, i) => ({
      ...slot,
      period_number: i + 1,
    }));
    setSlots(newSlots);
  };

  const updateSlot = (index: number, field: keyof PeriodSlot, value: any) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData: any = {
        branch: values.branch,
        shift: values.shift,
        name: values.name,
        slots: slots,
      };
      if (values.season) submitData.season = values.season;
      if (values.grade) submitData.grade = values.grade;

      if (editingTemplate) {
        updateMutation.mutate({ id: editingTemplate.id, data: submitData });
      } else {
        createMutation.mutate(submitData);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDuplicate = (template: PeriodTemplate) => {
    const newName = `${template.name} (Copy)`;
    duplicateMutation.mutate({ id: template.id, name: newName });
  };

  const templates: PeriodTemplate[] = templatesData?.data?.results || templatesData?.data || [];
  const branches = branchesData?.data?.results || branchesData?.data || [];
  const shifts = shiftsData?.data?.results || shiftsData?.data || [];
  const seasons = seasonsData?.data?.results || seasonsData?.data || [];
  const grades = gradesData?.data?.results || gradesData?.data || [];

  const activeTemplates = templates.filter((t) => t.is_active).length;
  const totalSlots = templates.reduce((sum, t) => sum + (t.slots?.length || 0), 0);

  return (
    <AntdLayout
      title="Period Templates"
      subtitle="Configure period timings for different grades and shifts"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
            Add Template
          </Button>
        </Space>
      }
    >
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Templates"
              value={templates.length}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Active Templates"
              value={activeTemplates}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <Statistic
              title="Total Period Slots"
              value={totalSlots}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Templates Grid */}
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
      ) : templates.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No period templates yet"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              Add Your First Template
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {templates.map((template) => (
            <Col xs={24} sm={12} lg={8} key={template.id}>
              <Card
                hoverable
                actions={[
                  <Tooltip title="Duplicate" key="duplicate">
                    <CopyOutlined onClick={() => handleDuplicate(template)} />
                  </Tooltip>,
                  <Tooltip title="Edit" key="edit">
                    <EditOutlined onClick={() => openDrawer(template)} />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="Delete Template"
                    description="Are you sure you want to delete this template?"
                    onConfirm={() => deleteMutation.mutate(template.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <DeleteOutlined style={{ color: '#ff4d4f' }} />
                  </Popconfirm>,
                ]}
              >
                <Card.Meta
                  avatar={
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        backgroundColor: template.is_active ? '#e6f4ff' : '#fff1f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ClockCircleOutlined
                        style={{
                          fontSize: 24,
                          color: template.is_active ? '#1677ff' : '#ff4d4f',
                        }}
                      />
                    </div>
                  }
                  title={
                    <Space>
                      <Text strong>{template.name}</Text>
                      <Tag color={template.is_active ? 'success' : 'error'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        <HomeOutlined />
                        <Text type="secondary">{template.branch_name}</Text>
                      </Space>
                      <Space wrap>
                        <Tag>{template.shift_name}</Tag>
                        {template.season_name && <Tag color="orange">{template.season_name}</Tag>}
                        {template.grade_name && <Tag color="blue">{template.grade_name}</Tag>}
                      </Space>
                    </Space>
                  }
                />
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Total Periods</Text>
                    <Text strong>{template.slots?.filter((s) => !s.is_break).length || 0}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Breaks</Text>
                    <Text strong>{template.slots?.filter((s) => s.is_break).length || 0}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Total Slots</Text>
                    <Text strong>{template.slots?.length || 0}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingTemplate ? 'Edit Period Template' : 'Add New Period Template'}
        placement="right"
        width={600}
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
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="e.g., Morning Shift - Summer" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="branch"
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="shift"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="season" label="Season (Optional)">
                <Select placeholder="All seasons" allowClear>
                  {seasons.map((season: any) => (
                    <Select.Option key={season.id} value={season.id}>
                      {season.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="grade" label="Grade (Optional)">
                <Select placeholder="All grades" allowClear>
                  {grades.map((grade: any) => (
                    <Select.Option key={grade.id} value={grade.id}>
                      {grade.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider />

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>Period Slots</Title>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addSlot}>
            Add Slot
          </Button>
        </div>

        {slots.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No slots added yet"
          >
            <Button type="dashed" icon={<PlusOutlined />} onClick={addSlot}>
              Add First Slot
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={slots}
            renderItem={(slot, index) => (
              <List.Item
                key={index}
                style={{
                  padding: '12px',
                  marginBottom: 8,
                  background: slot.is_break ? '#fff7e6' : '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Tag color={slot.is_break ? 'orange' : 'blue'}>#{slot.period_number}</Tag>
                      <Input
                        value={slot.name}
                        onChange={(e) => updateSlot(index, 'name', e.target.value)}
                        style={{ width: 150 }}
                        placeholder="Period name"
                      />
                    </Space>
                    <Space>
                      <Tooltip title="Mark as break">
                        <Switch
                          checkedChildren="Break"
                          unCheckedChildren="Period"
                          checked={slot.is_break}
                          onChange={(checked) => updateSlot(index, 'is_break', checked)}
                        />
                      </Tooltip>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeSlot(index)}
                      />
                    </Space>
                  </div>
                  <Space wrap>
                    <Space>
                      <Text type="secondary">Start:</Text>
                      <TimePicker
                        value={dayjs(slot.start_time, 'HH:mm')}
                        format="HH:mm"
                        onChange={(time) =>
                          updateSlot(index, 'start_time', time?.format('HH:mm') || '08:00')
                        }
                        style={{ width: 100 }}
                      />
                    </Space>
                    <Space>
                      <Text type="secondary">End:</Text>
                      <TimePicker
                        value={dayjs(slot.end_time, 'HH:mm')}
                        format="HH:mm"
                        onChange={(time) =>
                          updateSlot(index, 'end_time', time?.format('HH:mm') || '08:45')
                        }
                        style={{ width: 100 }}
                      />
                    </Space>
                    <Space>
                      <Text type="secondary">Duration:</Text>
                      <InputNumber
                        value={slot.duration_minutes}
                        onChange={(value) => updateSlot(index, 'duration_minutes', value || 45)}
                        min={5}
                        max={120}
                        style={{ width: 70 }}
                        addonAfter="min"
                      />
                    </Space>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </AntdLayout>
  );
}
