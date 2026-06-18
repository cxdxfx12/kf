import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Space, Input, Select, Modal, Form, message,
  Drawer, Descriptions, Avatar, List, Typography, Rate, Row, Col, Spin,
  Divider, Badge, Statistic, Progress, Tooltip, Popconfirm, Empty, Timeline, Alert
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, PhoneOutlined, UserOutlined,
  CheckCircleOutlined, TeamOutlined, StarFilled, CrownFilled, SolutionOutlined,
  WarningOutlined, UserAddOutlined, RiseOutlined, EditOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2', '#eb2f96', '#f5222d', '#fa8c16'];

const getAvatarColor = (id: number | string) => {
  const n = typeof id === 'number' ? id : parseInt(String(id || '0'), 10) || 0;
  return COLORS[n % COLORS.length];
};

const getAvatarText = (name?: string) => {
  if (!name) return '?';
  return String(name).charAt(0).toUpperCase();
};

const quickFilterOptions = [
  { key: '', label: '全部', color: '#1890ff', bg: '#e6f7ff', icon: <TeamOutlined /> },
  { key: 'vip', label: 'VIP客户', color: '#faad14', bg: '#fffbe6', icon: <CrownFilled /> },
  { key: 'normal', label: '普通客户', color: '#8c8c8c', bg: '#f5f5f5', icon: <UserOutlined /> },
  { key: 'active', label: '活跃客户', color: '#52c41a', bg: '#f6ffed', icon: <RiseOutlined /> },
  { key: 'complaint', label: '高投诉', color: '#ff4d4f', bg: '#fff1f0', icon: <WarningOutlined /> },
];

export default function Customers() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [vip, setVip] = useState('');
  const [quickFilter, setQuickFilter] = useState('');

  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const [stats, setStats] = useState({
    total: 0, vip: 0, normal: 0, active: 0, newMonth: 0, highComplaint: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { page, pageSize, keyword, vip } });
      const rows = res.data?.rows || [];
      const totalCount = res.data?.total || 0;

      const startOfMonth = dayjs().startOf('month');
      const activeCount = rows.filter((c: any) => (c.totalOrders || 0) > 0).length;
      const vipCount = rows.filter((c: any) => c.vip).length;
      const normalCount = rows.filter((c: any) => !c.vip).length;
      const newMonthCount = rows.filter((c: any) =>
        c.createdAt && dayjs(c.createdAt).isAfter(startOfMonth)
      ).length;
      const highComplaintCount = rows.filter((c: any) => (c.totalTickets || 0) >= 3).length;

      setStats({
        total: totalCount,
        vip: vipCount,
        normal: normalCount,
        active: activeCount,
        newMonth: newMonthCount,
        highComplaint: highComplaintCount,
      });

      let filtered = rows;
      if (quickFilter === 'vip') filtered = rows.filter((c: any) => c.vip);
      if (quickFilter === 'normal') filtered = rows.filter((c: any) => !c.vip);
      if (quickFilter === 'active') filtered = rows.filter((c: any) => (c.totalOrders || 0) > 0);
      if (quickFilter === 'complaint') filtered = rows.filter((c: any) => (c.totalTickets || 0) >= 3);

      setData(filtered);
      setTotal(filtered.length);
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, vip, quickFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showDetail = async (id: number) => {
    try {
      const res = await api.get(`/customers/${id}`);
      setDetail(res.data);
      setVisible(true);
    } catch {}
  };

  const openCreate = () => { setEditing(null); setEditOpen(true); form.resetFields(); };
  const openEdit = (row?: any) => {
    const target = row || detail;
    setEditing(target);
    setEditOpen(true);
    form.setFieldsValue(target || {});
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, values);
        message.success('已更新客户信息');
      } else {
        await api.post('/customers', values);
        message.success('客户创建成功');
      }
      setEditOpen(false);
      fetchData();
      if (visible && editing) showDetail(editing.id);
    } catch (err: any) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleCall = (phone?: string) => {
    if (!phone) return message.warning('该客户暂无电话信息');
    message.info(`正在拨打 ${phone}...`);
  };

  const CustomerCard = ({ customer }: { customer: any }) => {
    const avatarColor = getAvatarColor(customer.id);
    const tags = customer.tags ? String(customer.tags).split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    return (
      <Card
        size="small"
        className="customer-card"
        style={{
          marginBottom: 12,
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: '1px solid #f0f0f0',
        }}
        styles={{ body: { padding: 16 } }}
        onClick={() => showDetail(customer.id)}
        hoverable
      >
        <Row gutter={16}>
          <Col span={16}>
            <Space align="top" style={{ width: '100%' }}>
              <Avatar
                size={48}
                style={{
                  background: avatarColor,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {getAvatarText(customer.name)}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Space wrap>
                  <Text strong style={{ fontSize: 15 }}>{customer.name || '未知客户'}</Text>
                  {customer.vip && (
                    <Tag
                      icon={<StarFilled />}
                      style={{
                        color: '#faad14',
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                        fontWeight: 500,
                      }}
                    >
                      VIP
                    </Tag>
                  )}
                  {tags.slice(0, 3).map((t: string, i: number) => (
                    <Tag key={i} style={{ borderRadius: 10, fontSize: 11 }}>{t}</Tag>
                  ))}
                </Space>
                <div style={{ marginTop: 6 }}>
                  <Space wrap size="middle" split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                    {customer.phone && (
                      <Text type="secondary" style={{ fontSize: 12, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleCall(customer.phone); }}>
                        <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                        {customer.phone}
                      </Text>
                    )}
                    {customer.address && (
                      <Tooltip title={customer.address}>
                        <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                          <UserOutlined style={{ marginRight: 4 }} />
                          {customer.address}
                        </Text>
                      </Tooltip>
                    )}
                  </Space>
                </div>
              </div>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" align="end" style={{ width: '100%' }}>
              <Space size="small">
                <Tag color="blue" style={{ fontSize: 11 }}>{customer.totalOrders || 0} 订单</Tag>
                <Tag color={(customer.totalTickets || 0) >= 3 ? 'red' : 'default'} style={{ fontSize: 11 }}>
                  {customer.totalTickets || 0} 工单
                </Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {customer.lastContact ? dayjs(customer.lastContact).fromNow() : '尚未联系'}
              </Text>
              <Space size="small">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<PhoneOutlined />}
                  onClick={(e) => { e.stopPropagation(); handleCall(customer.phone); }}
                >
                  拨打
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ padding: 0 }}>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>👥 客户档案</Title>
          <Text type="secondary">客户信息管理，快速识别VIP客户与高投诉风险</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建客户</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="客户总数"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fffbe6' }}>
            <Statistic
              title="VIP客户"
              value={stats.vip}
              prefix={<CrownFilled style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f5f5f5' }}>
            <Statistic
              title="普通客户"
              value={stats.normal}
              prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f6ffed' }}>
            <Statistic
              title="本月活跃"
              value={stats.active}
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f9f0ff' }}>
            <Statistic
              title="本月新增"
              value={stats.newMonth}
              prefix={<UserAddOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff1f0' }}>
            <Statistic
              title="高投诉客户"
              value={stats.highComplaint}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快捷筛选 */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap align="center">
          <Text strong>快捷筛选：</Text>
          {quickFilterOptions.map((opt) => (
            <Button
              key={opt.key}
              type={quickFilter === opt.key ? 'primary' : 'default'}
              size="small"
              onClick={() => { setQuickFilter(opt.key); setPage(1); }}
              style={quickFilter === opt.key ? {} : { background: opt.bg, color: opt.color, borderColor: opt.color }}
            >
              {opt.icon} {opt.label}
            </Button>
          ))}
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <Text strong>高级筛选：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="姓名 / 电话 / 地址"
            style={{ width: 260 }}
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
          />
          <Select
            placeholder="VIP状态"
            allowClear
            style={{ width: 130 }}
            value={vip || undefined}
            onChange={v => { setVip(v); setPage(1); }}
          >
            <Option value="1">仅 VIP</Option>
            <Option value="0">仅普通</Option>
          </Select>
        </Space>
      </Card>

      {/* 客户列表 */}
      <Card
        title={
          <Space>
            <span>客户列表</span>
            <Badge count={total} style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={<Text type="secondary">第 {page} 页 / 共 {Math.max(1, Math.ceil(total / pageSize))} 页</Text>}
        style={{ borderRadius: 8 }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" description="加载中..." />
          </div>
        ) : data.length === 0 ? (
          <Empty description="暂无客户" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div>
            {data.map(customer => (
              <CustomerCard key={customer.id} customer={customer} />
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

      {/* 客户详情抽屉 */}
      <Drawer
        open={visible}
        onClose={() => setVisible(false)}
        width={720}
        title={
          <Space>
            <Avatar
              size={32}
              style={{ background: detail ? getAvatarColor(detail.id) : '#1890ff', color: '#fff', fontWeight: 600 }}
            >
              {getAvatarText(detail?.name)}
            </Avatar>
            <Text strong>{detail?.name || '客户详情'}</Text>
            {detail?.vip && <Tag icon={<StarFilled />} color="gold" style={{ fontSize: 11 }}>VIP</Tag>}
            {(detail?.totalTickets || 0) >= 3 && <Tag color="red" style={{ fontSize: 11 }}>⚠️ 高投诉</Tag>}
          </Space>
        }
        extra={
          detail && (
            <Space>
              <Button icon={<PhoneOutlined />} onClick={() => handleCall(detail.phone)}>拨打</Button>
              <Button type="primary" icon={<EditOutlined />} onClick={() => openEdit(detail)}>编辑</Button>
            </Space>
          )
        }
      >
        {detail && (
          <div>
            {/* 客户信息卡片 */}
            <Card size="small" title="基本信息" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Descriptions column={2} size="small" colon>
                <Descriptions.Item label="姓名" span={2}>
                  <Text strong>{detail.name}</Text>
                  {detail.vip && <CrownFilled style={{ color: '#faad14', marginLeft: 8 }} />}
                </Descriptions.Item>
                <Descriptions.Item label="电话">
                  <Space>
                    <Text>{detail.phone || '—'}</Text>
                    {detail.phone && <Button size="small" icon={<PhoneOutlined />} onClick={() => handleCall(detail.phone)}>拨打</Button>}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="邮箱">{detail.email || <Text type="secondary">—</Text>}</Descriptions.Item>
                <Descriptions.Item label="地址" span={2}>{detail.address || <Text type="secondary">—</Text>}</Descriptions.Item>
                <Descriptions.Item label="VIP 状态">
                  {detail.vip ? <Tag icon={<CrownFilled />} color="gold">VIP 客户</Tag> : <Tag>普通客户</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="标签">
                  <Space wrap>
                    {detail.tags
                      ? String(detail.tags).split(',').map((t: string, i: number) => t.trim() && <Tag key={i}>{t.trim()}</Tag>)
                      : <Text type="secondary">—</Text>}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">{detail.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm') : '—'}</Descriptions.Item>
                <Descriptions.Item label="最近联系">{detail.lastContact ? dayjs(detail.lastContact).format('YYYY-MM-DD HH:mm') : '尚未联系'}</Descriptions.Item>
                {detail.notes && (
                  <Descriptions.Item label="备注" span={2}>
                    <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{detail.notes}</Paragraph>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 统计摘要 */}
            <Card size="small" title="📊 统计摘要" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small" style={{ background: '#e6f7ff', borderRadius: 6, textAlign: 'center' }}>
                    <Statistic
                      title="订单数"
                      value={detail.totalOrders || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{
                    background: (detail.totalTickets || 0) >= 3 ? '#fff1f0' : '#f5f5f5',
                    borderRadius: 6,
                    textAlign: 'center',
                  }}>
                    <Statistic
                      title="工单数"
                      value={detail.totalTickets || 0}
                      valueStyle={{ color: (detail.totalTickets || 0) >= 3 ? '#ff4d4f' : '#8c8c8c' }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{
                    background: detail.vip ? '#fffbe6' : '#f5f5f5',
                    borderRadius: 6,
                    textAlign: 'center',
                  }}>
                    <Statistic
                      title="VIP 等级"
                      value={detail.vip ? 'VIP' : '普通'}
                      prefix={detail.vip ? <CrownFilled style={{ color: '#faad14' }} /> : <UserOutlined />}
                    />
                  </Card>
                </Col>
              </Row>
              {(detail.totalTickets || 0) >= 3 && (
                <Alert
                  type="warning"
                  showIcon
                  message="⚠️ 高投诉风险客户"
                  description={`该客户已累计 ${detail.totalTickets} 条工单，建议优先跟进处理，避免客诉升级。`}
                  style={{ marginTop: 12, borderRadius: 6 }}
                />
              )}
            </Card>

            {/* 操作日志 */}
            <Card size="small" title="📋 联系记录" style={{ borderRadius: 8 }}>
              <Timeline
                items={[
                  { color: 'blue', children: `客户创建 - ${detail.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm') : '未知'}` },
                  ...(detail.lastContact ? [{
                    color: 'green',
                    children: `最近联系 - ${dayjs(detail.lastContact).format('YYYY-MM-DD HH:mm')}`,
                  }] : [{ color: 'gray', children: '暂无联系记录' }]),
                ]}
              />
            </Card>
          </div>
        )}
      </Drawer>

      {/* 编辑/新建弹窗 */}
      <Modal
        open={editOpen}
        title={
          <Space>
            <span>{editing ? '📝 编辑客户' : '✨ 新建客户'}</span>
          </Space>
        }
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        okText="保存"
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="客户姓名" rules={[{ required: true, message: '请输入客户姓名' }]}>
                <Input placeholder="例如：张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话号码' }]}>
                <Input placeholder="例如：13800138000" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input placeholder="详细地址" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="email@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tags" label="标签">
                <Input placeholder="例如：VIP,常寄件（用逗号分隔）" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vip" label="VIP 客户" valuePropName="checked" initialValue={false}>
                <Select>
                  <Option value={true}>是（VIP客户）</Option>
                  <Option value={false}>否（普通客户）</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastContact" label="最近联系时间">
                <Input placeholder="YYYY-MM-DD HH:mm（可选）" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
