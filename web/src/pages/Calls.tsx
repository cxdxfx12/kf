import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card, Table, Tag, Button, Space, Input, Select, Modal, Form, message,
  Drawer, Descriptions, Avatar, List, Typography, Rate, Row, Col, Spin,
  Divider, Badge, Statistic, Progress, Tooltip, Empty, Timeline, Alert
} from 'antd';
import {
  PhoneOutlined, ReloadOutlined, SearchOutlined, UserOutlined,
  PhoneFilled, ExportOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, SoundOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { io } from 'socket.io-client';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const formatDuration = (seconds: number): string => {
  const s = seconds || 0;
  if (s < 60) return `${s}秒`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}分${sec}秒`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}小时${m}分`;
};

const formatMMSS = (seconds: number): string => {
  const s = seconds || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  connected: { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', icon: <CheckCircleOutlined />, label: '已接通' },
  missed: { color: '#ff4d4f', bg: '#fff1f0', border: '#ffccc7', icon: <CloseCircleOutlined />, label: '未接听' },
  failed: { color: '#fa8c16', bg: '#fff7e6', border: '#ffd591', icon: <CloseCircleOutlined />, label: '失败' },
};

const directionConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  inbound: { color: '#722ed1', bg: '#f9f0ff', icon: <PhoneFilled />, label: '来电' },
  outbound: { color: '#13c2c2', bg: '#e6fffb', icon: <ExportOutlined />, label: '外呼' },
};

export default function Calls() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [agentFilter, setAgentFilter] = useState<number | string>('');
  const [users, setUsers] = useState<any[]>([]);

  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const [stats, setStats] = useState({
    total: 0, inbound: 0, outbound: 0, connected: 0, missed: 0, totalDuration: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/calls', { params: { page, pageSize, keyword, direction, status, agentId: agentFilter || undefined } }),
        api.get('/calls/stats/summary', { params: { agentId: agentFilter || undefined } })
      ]);
      const rows = listRes.data?.rows || [];
      const statsData = statsRes.data || {};

      setStats({
        total: statsData.total || 0,
        inbound: statsData.inbound || 0,
        outbound: statsData.outbound || 0,
        connected: statsData.connected || 0,
        missed: statsData.missed || 0,
        totalDuration: statsData.totalDuration || 0,
      });

      setData(rows);
      setTotal(listRes.data?.total || 0);
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, direction, status, agentFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/users/agents/list').then(r => setUsers(r.data || []));
  }, []);

  useEffect(() => {
    const socket = io('/');
    socket.on('call:ended', () => fetchData());
    return () => { socket.disconnect(); };
  }, [fetchData]);

  const showDetail = async (call: any) => {
    try {
      const res = await api.get(`/calls/${call.id}`);
      setDetail(res.data);
      setVisible(true);
    } catch {
      setDetail(call);
      setVisible(true);
    }
  };

  const handleCall = async (phone: string) => {
    try {
      await api.post('/calls/outbound/call', { customerPhone: phone });
      message.success(`已发起外呼：${phone}`);
    } catch (err: any) {
      message.error(err.response?.data?.error || '外呼失败');
    }
  };

  const quickFilter = (d: string) => {
    setDirection(d === 'inbound' || d === 'outbound' ? d : '');
    setStatus(d === 'connected' || d === 'missed' ? d : '');
    setPage(1);
  };

  const isQuickActive = (d: string) => {
    if (d === 'all') return direction === '' && status === '';
    if (d === 'inbound' || d === 'outbound') return direction === d && status === '';
    if (d === 'connected' || d === 'missed') return status === d && direction === '';
    return false;
  };

  const renderStatus = (s: string) => {
    const cfg = statusConfig[s] || statusConfig.missed;
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

  const CallCard = ({ call }: { call: any }) => {
    const dirCfg = directionConfig[call.direction] || directionConfig.outbound;
    return (
      <Card
        size="small"
        style={{
          marginBottom: 12,
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: '1px solid #f0f0f0',
        }}
        styles={{ body: { padding: 16 } }}
        onClick={() => showDetail(call)}
        hoverable
      >
        <Row gutter={16}>
          <Col span={16}>
            <Space align="start">
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: dirCfg.bg, color: dirCfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18
              }}>
                {dirCfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Space align="center">
                  <Text strong style={{ fontSize: 15 }}>{call.customerName || call.customer?.name || '未知客户'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{call.customerPhone || call.customer?.phone || '—'}</Text>
                  <Tag
                    icon={dirCfg.icon}
                    style={{
                      color: dirCfg.color,
                      background: dirCfg.bg,
                      border: `1px solid ${dirCfg.color}33`,
                      fontSize: 11,
                      marginLeft: 8
                    }}
                  >
                    {dirCfg.label}
                  </Tag>
                </Space>
                <div style={{ marginTop: 4 }}>
                  <Space size="middle" split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <UserOutlined style={{ marginRight: 4 }} />
                      {call.agent?.realName || call.agentName || '—'}
                    </Text>
                    {renderStatus(call.status)}
                  </Space>
                </div>
                {call.notes && (
                  <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 1, expandable: false }}
                    style={{ fontSize: 12, margin: '4px 0 0 0' }}
                  >
                    {call.notes}
                  </Paragraph>
                )}
              </div>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" align="end" style={{ width: '100%' }}>
              <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {formatMMSS(call.duration)}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {dayjs(call.startTime || call.createdAt).fromNow()}
              </Text>
              <Button
                type="primary"
                size="small"
                icon={<PhoneOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCall(call.customerPhone || call.customer?.phone);
                }}
              >
                再次拨打
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>📞 通话记录</Title>
          <Text type="secondary">查看和管理所有客户通话记录</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, cursor: 'pointer' }} hoverable onClick={() => quickFilter('all')}>
            <Statistic
              title="通话总数"
              value={stats.total}
              prefix={<PhoneOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f9f0ff', cursor: 'pointer' }} hoverable onClick={() => quickFilter('inbound')}>
            <Statistic
              title="来电数"
              value={stats.inbound}
              prefix={<PhoneFilled style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#e6fffb', cursor: 'pointer' }} hoverable onClick={() => quickFilter('outbound')}>
            <Statistic
              title="外呼数"
              value={stats.outbound}
              prefix={<ExportOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f6ffed', cursor: 'pointer' }} hoverable onClick={() => quickFilter('connected')}>
            <Statistic
              title="已接通"
              value={stats.connected}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff1f0', cursor: 'pointer' }} hoverable onClick={() => quickFilter('missed')}>
            <Statistic
              title="未接听"
              value={stats.missed}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff7e6', cursor: 'pointer' }} hoverable onClick={() => { setDirection(''); setStatus(''); setKeyword(''); setPage(1); fetchData(); message.info('显示所有通话记录'); }}>
            <Statistic
              title="总时长"
              value={formatDuration(stats.totalDuration)}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap align="center">
          <Text strong>快捷筛选：</Text>
          <Button
            type={isQuickActive('all') ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('all')}
          >全部</Button>
          <Button
            type={isQuickActive('inbound') ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('inbound')}
          >来电</Button>
          <Button
            type={isQuickActive('outbound') ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('outbound')}
          >外呼</Button>
          <Button
            type={isQuickActive('connected') ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('connected')}
          >已接通</Button>
          <Button
            type={isQuickActive('missed') ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('missed')}
          >未接听</Button>
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <Text strong>高级筛选：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="姓名 / 电话"
            style={{ width: 220 }}
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
            onPressEnter={fetchData}
          />
          <Select
            placeholder="坐席"
            allowClear
            style={{ width: 140 }}
            value={agentFilter || undefined}
            onChange={v => { setAgentFilter(v); setPage(1); }}
          >
            {(Array.isArray(users) ? users : []).map((u: any) => (
              <Option key={u.id} value={u.id}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {u.realName}
                </Space>
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <span>通话列表</span>
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
        ) : (Array.isArray(data) && data.length === 0) ? (
          <Empty description="暂无通话记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div>
            {(Array.isArray(data) ? data : []).map(call => (
              <CallCard key={call.id} call={call} />
            ))}
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

      <Drawer
        open={visible}
        onClose={() => setVisible(false)}
        width={720}
        title={
          <Space>
            <span>通话详情</span>
            {detail && <Tag>#{detail.id}</Tag>}
            {detail && (
              <Tag
                icon={directionConfig[detail.direction]?.icon}
                style={{
                  color: directionConfig[detail.direction]?.color,
                  background: directionConfig[detail.direction]?.bg,
                  border: `1px solid ${directionConfig[detail.direction]?.color}33`,
                }}
              >
                {directionConfig[detail.direction]?.label || '通话'}
              </Tag>
            )}
          </Space>
        }
        extra={
          detail && (
            <Space>
              <Button
                type="primary"
                icon={<PhoneOutlined />}
                onClick={() => handleCall(detail.customerPhone || detail.customer?.phone)}
              >
                再次拨打
              </Button>
            </Space>
          )
        }
      >
        {detail && (
          <div>
            <Card size="small" title="通话摘要" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Descriptions column={2} size="small" colon>
                <Descriptions.Item label="通话方向">
                  <Tag
                    icon={directionConfig[detail.direction]?.icon}
                    style={{
                      color: directionConfig[detail.direction]?.color,
                      background: directionConfig[detail.direction]?.bg,
                      border: 'none',
                    }}
                  >
                    {directionConfig[detail.direction]?.label || '通话'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="通话时长">
                  <Text strong>{formatMMSS(detail.duration)}（{formatDuration(detail.duration)}）</Text>
                </Descriptions.Item>
                <Descriptions.Item label="通话状态">
                  {renderStatus(detail.status)}
                </Descriptions.Item>
                <Descriptions.Item label="坐席">
                  {detail.agent?.realName || detail.agentName || <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">
                  {dayjs(detail.startTime || detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="结束时间">
                  {detail.endTime ? dayjs(detail.endTime).format('YYYY-MM-DD HH:mm:ss') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="客户姓名">
                  {detail.customerName || detail.customer?.name || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="客户电话">
                  <Space>
                    <Text>{detail.customerPhone || detail.customer?.phone || '—'}</Text>
                    <Button
                      size="small"
                      icon={<PhoneOutlined />}
                      onClick={() => handleCall(detail.customerPhone || detail.customer?.phone)}
                    >拨打</Button>
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {detail.notes && (
              <Card size="small" title="📝 通话备注" style={{ marginBottom: 12, borderRadius: 8 }}>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detail.notes}</Paragraph>
              </Card>
            )}

            {detail.recordingUrl && (
              <Card size="small" title="🎵 录音播放" style={{ marginBottom: 12, borderRadius: 8 }}>
                <audio
                  ref={audioRef}
                  src={detail.recordingUrl}
                  controls
                  style={{ width: '100%' }}
                />
              </Card>
            )}

            {detail.transcript && (
              <Card size="small" title="📋 通话文本" style={{ borderRadius: 8 }}>
                <div style={{
                  background: '#fafafa',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #eee',
                }}>
                  {detail.transcript}
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
