import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Space, Input, Select, Modal, Form, message,
  Drawer, Descriptions, Avatar, List, Typography, Rate, Row, Col, Spin,
  Divider, Badge, Statistic, Progress, Tooltip, Popconfirm, Empty, Timeline, Alert
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, PhoneOutlined, UserOutlined,
  RobotOutlined, CheckCircleOutlined, ThunderboltOutlined, SoundOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  TeamOutlined, AlertOutlined, SolutionOutlined, MessageOutlined,
  WifiOutlined, SendOutlined, AudioOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 工单类型配置
const typeConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  complaint: { color: '#ff4d4f', bg: '#fff1f0', icon: <ExclamationCircleOutlined />, label: '投诉' },
  query: { color: '#1890ff', bg: '#e6f7ff', icon: <MessageOutlined />, label: '查询' },
  service: { color: '#52c41a', bg: '#f6ffed', icon: <SolutionOutlined />, label: '服务' },
  claim: { color: '#fa8c16', bg: '#fff7e6', icon: <AlertOutlined />, label: '理赔' },
  other: { color: '#8c8c8c', bg: '#f5f5f5', icon: <TeamOutlined />, label: '其他' },
};

// 优先级配置
const priorityConfig: Record<string, { color: string; dot: string; label: string; sort: number }> = {
  urgent: { color: '#ff4d4f', dot: '🔴', label: '紧急', sort: 0 },
  high: { color: '#fa8c16', dot: '🟠', label: '高', sort: 1 },
  medium: { color: '#1890ff', dot: '🔵', label: '中', sort: 2 },
  low: { color: '#52c41a', dot: '🟢', label: '低', sort: 3 },
};

// 状态配置 - 全新设计
const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string; shortLabel: string }> = {
  open: { color: '#ff4d4f', bg: '#fff1f0', border: '#ffccc7', icon: <ClockCircleOutlined />, label: '待处理', shortLabel: '待处理' },
  assigned: { color: '#fa8c16', bg: '#fff7e6', border: '#ffd591', icon: <TeamOutlined />, label: '已分配', shortLabel: '已分配' },
  processing: { color: '#1890ff', bg: '#e6f7ff', border: '#91d5ff', icon: <SendOutlined />, label: '处理中', shortLabel: '处理中' },
  waiting: { color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7', icon: <MessageOutlined />, label: '待回复', shortLabel: '待回复' },
  resolved: { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', icon: <CheckCircleOutlined />, label: '已解决', shortLabel: '已解决' },
  ai_resolved: { color: '#13c2c2', bg: '#e6fffb', border: '#87e8de', icon: <RobotOutlined />, label: 'AI已处理', shortLabel: 'AI已处理' },
  closed: { color: '#8c8c8c', bg: '#f5f5f5', border: '#d9d9d9', icon: <CloseCircleOutlined />, label: '已关闭', shortLabel: '已关闭' },
};

export default function Tickets() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');
  const [aiProcessedCount, setAiProcessedCount] = useState(0);

  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [aiSuggest, setAiSuggest] = useState<any>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm] = Form.useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [comment, setComment] = useState('');

  // AI 自动处理相关
  const [aiCallLoading, setAiCallLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiResultVisible, setAiResultVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);

  // 统计数据
  const [stats, setStats] = useState({
    total: 0, open: 0, processing: 0, resolved: 0, aiResolved: 0, closed: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets', { params: { page, pageSize, keyword, status, priority, type } });
      const rows = res.data?.rows || [];

      // 计算统计数据
      const today = dayjs().startOf('day');
      const aiResolvedTickets = rows.filter((t: any) => t.aiProcessed);
      const todayResolved = rows.filter((t: any) =>
        t.status === 'resolved' && dayjs(t.resolvedAt || t.updatedAt).isAfter(today)
      );

      setStats({
        total: res.data?.total || 0,
        open: rows.filter((t: any) => t.status === 'open').length,
        processing: rows.filter((t: any) => ['assigned', 'processing', 'waiting'].includes(t.status)).length,
        resolved: rows.filter((t: any) => t.status === 'resolved').length,
        aiResolved: aiResolvedTickets.length,
        closed: rows.filter((t: any) => t.status === 'closed').length,
      });

      // 为每个工单添加 AI 处理状态标记
      const rowsWithAiStatus = rows.map((t: any) => ({
        ...t,
        displayStatus: t.aiProcessed ? 'ai_resolved' : t.status,
      }));

      setData(rowsWithAiStatus);
      setTotal(res.data?.total || 0);
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, status, priority, type]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { api.get('/users/agents/list').then(r => setUsers(r.data || [])); }, []);

  const showDetail = async (id: number) => {
    try {
      const res = await api.get(`/tickets/${id}`);
      setDetail(res.data);
      setAiResult(null);
      setVisible(true);
    } catch {}
  };

  const handleCreate = async (values: any) => {
    try {
      await api.post('/tickets', values);
      message.success('工单创建成功');
      setCreateOpen(false);
      form.resetFields();
      setAiSuggest(null);
      fetchData();
    } catch (err: any) { message.error(err.response?.data?.error || '创建失败'); }
  };

  const handleAiSuggest = async () => {
    const values = form.getFieldsValue();
    if (!values.description) return message.warning('请先填写描述');
    try {
      const res = await api.post('/tickets/ai/suggest', { type: values.type || 'query', description: values.description });
      setAiSuggest(res.data);
    } catch {}
  };

  const handleResolve = async () => {
    try {
      await api.post(`/tickets/${detail?.id}/resolve`, { resolution: '已电话联系客户，问题已解决' });
      message.success('工单已解决');
      setVisible(false);
      fetchData();
    } catch {}
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tickets/${detail?.id}/comments`, { content: comment });
      setComment('');
      message.success('备注已添加');
      showDetail(detail.id);
    } catch {}
  };

  const handleAssign = async (values: any) => {
    try {
      await api.post(`/tickets/${detail?.id}/assign`, { assignedTo: values.assignedTo });
      message.success('已分配');
      setAssignOpen(false);
      fetchData();
      showDetail(detail.id);
    } catch {}
  };

  // AI自动处理
  const handleAutoCall = async (ticket?: any) => {
    const targetId = ticket?.id || detail?.id;
    if (!targetId) {
      message.warning('请先选择工单');
      return;
    }

    setAiCallLoading(true);
    setAiResult(null);
    setCallModalVisible(true);

    message.info('🤖 AI正在发起自动通话，请稍候...');

    try {
      const res = await api.post(`/ai-tickets/${targetId}/auto-call`);
      const result = res.data;

      setAiResult(result);

      if (result.success) {
        if (result.analysis?.shouldClose) {
          message.success(`✅ AI已自动处理完成，工单已关闭`);
        } else {
          message.warning(`⚠️ AI建议：${result.analysis?.nextAction || '需要人工跟进'}`);
        }
        fetchData();
        if (detail) showDetail(detail.id);
      } else {
        message.error(result.message || 'AI处理失败');
      }
    } catch (err: any) {
      message.error(err.response?.data?.error || 'AI处理异常，请稍后重试');
    } finally {
      setAiCallLoading(false);
    }
  };

  const quickFilter = (s: string) => {
    setStatus(s);
    setPage(1);
  };

  // 渲染状态标签（支持AI状态）
  const renderStatus = (statusKey: string, aiProcessed?: boolean) => {
    const s = aiProcessed ? 'ai_resolved' : statusKey;
    const cfg = statusConfig[s] || statusConfig.open;
    return (
      <Tag
        icon={cfg.icon}
        style={{
          color: cfg.color,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          fontWeight: 500,
        }}
      >
        {cfg.label}
      </Tag>
    );
  };

  // 渲染优先级
  const renderPriority = (p: string) => {
    const cfg = priorityConfig[p] || priorityConfig.medium;
    return (
      <Space size={4}>
        <span style={{ fontSize: 12 }}>{cfg.dot}</span>
        <Text style={{ color: cfg.color, fontWeight: 500 }}>{cfg.label}</Text>
      </Space>
    );
  };

  // 卡片式工单列表项
  const TicketCard = ({ ticket }: { ticket: any }) => {
    const typeCfg = typeConfig[ticket.type] || typeConfig.other;
    const statusDisplay = ticket.displayStatus || ticket.status;

    return (
      <Card
        size="small"
        className="ticket-card"
        style={{
          marginBottom: 12,
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: '1px solid #f0f0f0',
        }}
        styles={{ body: { padding: 16 } }}
        onClick={() => showDetail(ticket.id)}
        hoverable
      >
        <Row gutter={16}>
          <Col span={16}>
            <Space align="top">
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: typeCfg.bg, color: typeCfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18
              }}>
                {typeCfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Space>
                  <Text strong style={{ fontSize: 15 }}>{ticket.title}</Text>
                  <Tag style={{ fontSize: 11, marginLeft: 8 }}>#{ticket.id}</Tag>
                  {ticket.aiProcessed && <Tag icon={<RobotOutlined />} color="cyan" style={{ fontSize: 11 }}>AI处理</Tag>}
                </Space>
                <div style={{ marginTop: 4 }}>
                  <Space size="middle" split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <UserOutlined style={{ marginRight: 4 }} />
                      {ticket.customer?.name || '—'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <PhoneOutlined style={{ marginRight: 4 }} />
                      {ticket.customer?.phone || '—'}
                    </Text>
                  </Space>
                </div>
                {ticket.description && (
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 1, expandable: false }}
                    style={{ fontSize: 12, margin: '4px 0 0 0' }}
                  >
                    {ticket.description}
                  </Paragraph>
                )}
              </div>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" align="end" style={{ width: '100%' }}>
              <Space>
                {renderPriority(ticket.priority)}
              </Space>
              <Space align="center">
                {renderStatus(ticket.status, ticket.aiProcessed)}
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(ticket.createdAt).fromNow()}
              </Text>
            </Space>
          </Col>
        </Row>
        {ticket.assignee && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #f0f0f0' }}>
            <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: 6 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>分配给：{ticket.assignee.realName}</Text>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: 0 }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>📋 工单中心</Title>
          <Text type="secondary">管理和处理客户工单，支持AI自动处理</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建工单</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, cursor: 'pointer' }} hoverable onClick={() => quickFilter('')}>
            <Statistic
              title="工单总数"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff1f0', cursor: 'pointer' }} hoverable onClick={() => quickFilter('open')}>
            <Statistic
              title="待处理"
              value={stats.open}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#e6f7ff', cursor: 'pointer' }} hoverable onClick={() => quickFilter('processing')}>
            <Statistic
              title="处理中"
              value={stats.processing}
              prefix={<SendOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f6ffed', cursor: 'pointer' }} hoverable onClick={() => quickFilter('resolved')}>
            <Statistic
              title="已解决"
              value={stats.resolved}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#e6fffb', cursor: 'pointer' }} hoverable onClick={() => { setStatus(''); setType(''); setPriority(''); setKeyword(''); setPage(1); fetchData(); message.info('AI已处理工单列表'); }}>
            <Statistic
              title="AI已处理"
              value={stats.aiResolved}
              prefix={<RobotOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f5f5f5', cursor: 'pointer' }} hoverable onClick={() => quickFilter('closed')}>
            <Statistic
              title="已关闭"
              value={stats.closed}
              prefix={<CloseCircleOutlined style={{ color: '#8c8c8c' }} />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷筛选 */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap align="center">
          <Text strong>快捷筛选：</Text>
          <Button
            type={status === '' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('')}
          >全部</Button>
          <Button
            type={status === 'open' ? 'primary' : 'default'}
            size="small"
            danger={status !== 'open'}
            onClick={() => quickFilter('open')}
          >待处理</Button>
          <Button
            type={status === 'processing' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('processing')}
          >处理中</Button>
          <Button
            type={status === 'waiting' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('waiting')}
          >待回复</Button>
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <Text strong>高级筛选：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索工单..."
            style={{ width: 200 }}
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
          />
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 110 }}
            value={type || undefined}
            onChange={v => { setType(v); setPage(1); }}
          >
            {Object.entries(typeConfig).map(([k, v]) => (
              <Option key={k} value={k}>{v.label}</Option>
            ))}
          </Select>
          <Select
            placeholder="优先级"
            allowClear
            style={{ width: 100 }}
            value={priority || undefined}
            onChange={v => { setPriority(v); setPage(1); }}
          >
            {Object.entries(priorityConfig).map(([k, v]) => (
              <Option key={k} value={k}>{v.label}</Option>
            ))}
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={status || undefined}
            onChange={v => { setStatus(v); setPage(1); }}
          >
            {Object.entries(statusConfig).map(([k, v]) => (
              <Option key={k} value={k}>{v.label}</Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* 工单列表 */}
      <Card
        title={
          <Space>
            <span>工单列表</span>
            <Badge count={total} style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={<Text type="secondary">第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页</Text>}
        style={{ borderRadius: 8 }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" description="加载中..." />
          </div>
        ) : data.length === 0 ? (
          <Empty description="暂无工单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div>
            {data.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
            {/* 分页 */}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Space>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >上一页</Button>
                <span>第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 页</span>
                <Button
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => setPage(p => p + 1)}
                >下一页</Button>
              </Space>
            </div>
          </div>
        )}
      </Card>

      {/* 工单详情抽屉 */}
      <Drawer
        open={visible}
        onClose={() => setVisible(false)}
        width={720}
        title={
          <Space>
            <span>工单详情</span>
            {detail && <Tag>#{detail.id}</Tag>}
            {detail?.aiProcessed && <Tag icon={<RobotOutlined />} color="cyan">AI已处理</Tag>}
          </Space>
        }
        extra={
          detail && (
            <Space>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => handleAutoCall()}
                loading={aiCallLoading}
              >
                AI自动处理
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleResolve}
                disabled={['resolved', 'closed', 'ai_resolved'].includes(detail?.status)}
              >
                标记已解决
              </Button>
            </Space>
          )
        }
      >
        {detail && (
          <div>
            {/* AI处理结果 */}
            {aiResult && (
              <Card
                size="small"
                style={{
                  marginBottom: 16,
                  background: aiResult.analysis?.shouldClose ? '#f6ffed' : '#fff7e6',
                  border: `1px solid ${aiResult.analysis?.shouldClose ? '#b7eb8f' : '#ffd591'}`,
                  borderRadius: 8,
                }}
              >
                <Space style={{ marginBottom: 8 }}>
                  {aiResult.analysis?.shouldClose ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">✅ AI处理完成（工单已自动关闭）</Tag>
                  ) : (
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">⚠️ AI建议需要人工跟进</Tag>
                  )}
                </Space>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text type="secondary">摘要：</Text>
                    <Text>{aiResult.analysis?.summary || '—'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">置信度：</Text>
                    <Progress
                      percent={Math.round((aiResult.analysis?.confidence || 0) * 100)}
                      size="small"
                      status={aiResult.analysis?.confidence >= 0.6 ? 'success' : 'exception'}
                      style={{ display: 'inline-block', width: 100, marginLeft: 8 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">AI建议：</Text>
                    <Text>{aiResult.analysis?.nextAction || '—'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">情感分析：</Text>
                    <Tag color={
                      aiResult.analysis?.sentiment?.label === 'positive' ? 'green' :
                      aiResult.analysis?.sentiment?.label === 'negative' ? 'red' : 'default'
                    }>
                      {aiResult.analysis?.sentiment?.label === 'positive' ? '😊 客户满意' :
                       aiResult.analysis?.sentiment?.label === 'negative' ? '😠 客户不满' : '😐 中性'}
                    </Tag>
                  </Col>
                </Row>
                {aiResult.analysis?.keywords?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">🏷 关键词：</Text>
                    <Space wrap>
                      {aiResult.analysis.keywords.map((k: string, i: number) => (
                        <Tag key={i} style={{ borderRadius: 12 }}>{k}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
                {aiResult.session?.transcript && (
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ fontWeight: 500 }}>📞 通话记录：</Text>
                    <div style={{
                      background: '#fafafa',
                      padding: 12,
                      borderRadius: 6,
                      marginTop: 4,
                      fontSize: 13,
                      whiteSpace: 'pre-wrap',
                      border: '1px solid #eee',
                      maxHeight: 150,
                      overflow: 'auto',
                    }}>{aiResult.session.transcript}</div>
                  </div>
                )}
              </Card>
            )}

            {/* 基本信息 */}
            <Card size="small" title="基本信息" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Descriptions column={2} size="small" colon>
                <Descriptions.Item label="工单标题" span={2}>
                  <Text strong>{detail.title}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="类型">
                  <Tag style={{ background: typeConfig[detail.type]?.bg, color: typeConfig[detail.type]?.color, border: 'none' }}>
                    {typeConfig[detail.type]?.icon} {typeConfig[detail.type]?.label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="优先级">
                  <Space>{renderPriority(detail.priority)}</Space>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {renderStatus(detail.status, detail.aiProcessed)}
                </Descriptions.Item>
                <Descriptions.Item label="SLA">
                  <Text>{detail.slaMinutes} 分钟</Text>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="客户姓名">{detail.customer?.name}</Descriptions.Item>
                <Descriptions.Item label="客户电话">
                  <Space>
                    <Text>{detail.customer?.phone}</Text>
                    <Button size="small" icon={<PhoneOutlined />} onClick={() => message.info(`拨打 ${detail.customer?.phone}`)}>拨打</Button>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="分配坐席">
                  {detail.assignee?.realName || <Text type="secondary">未分配</Text>}
                </Descriptions.Item>
                {detail.orderId && (
                  <Descriptions.Item label="关联订单" span={2}>
                    <Tag>#{detail.orderId}</Tag>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="问题描述" span={2}>
                  <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detail.description}</Paragraph>
                </Descriptions.Item>
                {detail.resolution && (
                  <Descriptions.Item label="处理结果" span={2}>
                    <Tag color="green" icon={<CheckCircleOutlined />}>{detail.resolution}</Tag>
                  </Descriptions.Item>
                )}
                {detail.satisfaction && (
                  <Descriptions.Item label="客户满意度" span={2}>
                    <Rate disabled value={detail.satisfaction} allowHalf />
                    <Text type="secondary" style={{ marginLeft: 8 }}>{detail.satisfaction} / 5</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 跟进记录 */}
            <Card size="small" title="💬 跟进记录" style={{ marginBottom: 12, borderRadius: 8 }}>
              <List
                dataSource={detail.comments || []}
                locale={{ emptyText: '暂无跟进记录' }}
                renderItem={(item: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} style={{ background: '#1890ff' }} />}
                      title={
                        <Space>
                          <Text strong>{item.author?.realName || '系统'}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </Space>
                      }
                      description={<Paragraph style={{ margin: 0 }}>{item.content}</Paragraph>}
                    />
                  </List.Item>
                )}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="添加处理备注..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onPressEnter={handleAddComment}
                  suffix={
                    <Space size={4}>
                      <Tooltip title="发送备注">
                        <Button type="text" size="small" icon={<SendOutlined />} onClick={handleAddComment} />
                      </Tooltip>
                      <Tooltip title="AI智能分析">
                        <Button type="text" size="small" icon={<RobotOutlined />} onClick={() => message.info('AI分析功能开发中')} />
                      </Tooltip>
                    </Space>
                  }
                />
              </Space.Compact>
            </Card>

            {/* 操作日志 */}
            <Card size="small" title="📋 操作日志" style={{ borderRadius: 8 }}>
              <Timeline
                items={[
                  { color: 'blue', children: `工单创建 - ${dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}` },
                  ...(detail.comments || []).map((c: any) => ({
                    color: 'gray',
                    children: `${c.author?.realName || '系统'} - ${dayjs(c.createdAt).format('YYYY-MM-DD HH:mm')}`,
                  })),
                  ...(detail.resolution ? [{
                    color: 'green',
                    children: `已解决 - ${dayjs(detail.resolvedAt || detail.updatedAt).format('YYYY-MM-DD HH:mm')}`,
                  }] : []),
                ]}
              />
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建工单 */}
      <Modal
        open={createOpen}
        title={
          <Space>
            <span>📝 新建工单</span>
          </Space>
        }
        onCancel={() => { setCreateOpen(false); setAiSuggest(null); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="创建工单"
        width={700}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="工单类型" rules={[{ required: true }]}>
                <Select placeholder="选择类型">
                  {Object.entries(typeConfig).map(([k, v]) => (
                    <Option key={k} value={k}>
                      <Space><span style={{ color: v.color }}>{v.icon}</span>{v.label}</Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="优先级" rules={[{ required: true }]} initialValue="medium">
                <Select>
                  {Object.entries(priorityConfig).map(([k, v]) => (
                    <Option key={k} value={k}>
                      <Space><span>{v.dot}</span>{v.label}</Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="title" label="工单标题" rules={[{ required: true }]}>
            <Input placeholder="简要描述客户的问题，如：包裹破损投诉、运单查询等" />
          </Form.Item>
          <Form.Item name="description" label="详细描述" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="详细描述客户咨询/投诉的问题，包括：包裹单号、问题详情、客户诉求等" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customerId" label="关联客户">
                <Select showSearch placeholder="搜索客户" optionFilterProp="children" allowClear>
                  <Option value="">无</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="orderId" label="关联订单">
                <Select showSearch placeholder="搜索订单号" allowClear>
                  <Option value="">无</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Divider style={{ margin: '16px 0' }} />
        <Space style={{ marginBottom: 12 }}>
          <Button icon={<RobotOutlined />} onClick={handleAiSuggest} loading={aiSuggest === null}>AI 智能建议</Button>
          <Text type="secondary" style={{ fontSize: 12 }}>基于工单类型和描述自动生成处理建议</Text>
        </Space>
        {aiSuggest && (
          <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f', borderRadius: 8 }}>
            <Text strong style={{ color: '#52c41a' }}>💡 AI处理建议：</Text>
            <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
              {(aiSuggest.suggestedActions || []).map((s: string, i: number) => (
                <li key={i} style={{ marginBottom: 4 }}>{s}</li>
              ))}
            </ul>
            <Text type="secondary" style={{ fontSize: 12 }}>
              来源：{aiSuggest.source} · 建议优先级：{aiSuggest.priority}
            </Text>
          </Card>
        )}
      </Modal>

      {/* 分配坐席 */}
      <Modal
        open={assignOpen}
        title="分配坐席"
        onCancel={() => setAssignOpen(false)}
        onOk={() => assignForm.submit()}
        okText="确认分配"
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssign}>
          <Form.Item name="assignedTo" label="选择坐席" rules={[{ required: true }]}>
            <Select placeholder="请选择坐席" showSearch optionFilterProp="children">
              {users.map((u: any) => (
                <Option key={u.id} value={u.id}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    {u.realName}（{u.username}）
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* AI通话弹窗 */}
      <Modal
        open={callModalVisible}
        title="🤖 AI自动处理中"
        footer={null}
        closable={!aiCallLoading}
        onCancel={() => !aiCallLoading && setCallModalVisible(false)}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {aiCallLoading ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                <RobotOutlined spin />
              </div>
              <Title level={4}>AI正在发起通话...</Title>
              <Text type="secondary">正在自动拨打电话给客户，进行智能语音交互</Text>
              <div style={{ marginTop: 24 }}>
                <Spin description="通话处理中，请稍候..." />
              </div>
            </>
          ) : aiResult ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {aiResult.analysis?.shouldClose ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
                )}
              </div>
              <Title level={4}>
                {aiResult.analysis?.shouldClose ? '✅ AI处理完成' : '⚠️ AI建议人工跟进'}
              </Title>
              <Button type="primary" onClick={() => setCallModalVisible(false)}>确定</Button>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
