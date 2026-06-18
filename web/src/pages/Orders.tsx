import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Tag, Button, Space, Input, Select, Modal, Form, message,
  Drawer, Descriptions, List, Typography, Row, Col, Spin,
  Divider, Badge, Statistic, Tooltip, Empty, Timeline, Alert
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, PhoneOutlined,
  CheckCircleOutlined, InboxOutlined, RocketFilled, CarryOutFilled,
  WarningOutlined, EnvironmentOutlined, ClockCircleOutlined, TeamOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 快递公司配置
const courierConfig: Record<string, { color: string; bg: string; label: string }> = {
  sto: { color: '#1890ff', bg: '#e6f7ff', label: '申通快递' },
  yto: { color: '#fa8c16', bg: '#fff7e6', label: '圆通速递' },
  zto: { color: '#ff4d4f', bg: '#fff1f0', label: '中通快递' },
  zjs: { color: '#722ed1', bg: '#f9f0ff', label: '宅急送' },
  bestexpress: { color: '#52c41a', bg: '#f6ffed', label: '百世快递' },
};

// 状态配置
const statusConfig: Record<string, { color: string; bg: string; border: string; label: string; antColor: string }> = {
  pending: { color: '#8c8c8c', bg: '#f5f5f5', border: '#d9d9d9', label: '待揽收', antColor: 'default' },
  collected: { color: '#1890ff', bg: '#e6f7ff', border: '#91d5ff', label: '已揽收', antColor: 'blue' },
  transit: { color: '#13c2c2', bg: '#e6fffb', border: '#87e8de', label: '运输中', antColor: 'cyan' },
  delivery: { color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7', label: '派送中', antColor: 'purple' },
  delivered: { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', label: '已签收', antColor: 'green' },
  exception: { color: '#ff4d4f', bg: '#fff1f0', border: '#ffccc7', label: '异常件', antColor: 'red' },
  returned: { color: '#fa8c16', bg: '#fff7e6', border: '#ffd591', label: '已退回', antColor: 'orange' },
};

export default function Orders() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [courier, setCourier] = useState('');

  const [detail, setDetail] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  // 统计数据
  const [stats, setStats] = useState({
    total: 0, pending: 0, transit: 0, delivery: 0, delivered: 0, exception: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders', { params: { page, pageSize, keyword, status, courier } });
      const rows = res.data?.rows || [];

      setStats({
        total: res.data?.total || 0,
        pending: rows.filter((o: any) => o.status === 'pending' || o.status === 'collected').length,
        transit: rows.filter((o: any) => o.status === 'transit').length,
        delivery: rows.filter((o: any) => o.status === 'delivery').length,
        delivered: rows.filter((o: any) => o.status === 'delivered').length,
        exception: rows.filter((o: any) => o.status === 'exception' || o.status === 'returned').length,
      });

      setData(rows);
      setTotal(res.data?.total || 0);
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, status, courier]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showDetail = async (id: number) => {
    try {
      const res = await api.get(`/orders/${id}`);
      setDetail(res.data);
      setVisible(true);
    } catch {}
  };

  const handleCreate = async (values: any) => {
    try {
      await api.post('/orders', { ...values, status: 'pending' });
      message.success('订单创建成功');
      setCreateOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) { message.error(err.response?.data?.error || '创建失败'); }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.post(`/orders/${id}/status`, { status: newStatus, location: '网点仓库', description: '状态更新' });
      message.success('状态已更新');
      fetchData();
    } catch (err: any) { message.error(err.response?.data?.error || '更新失败'); }
  };

  const quickFilter = (s: string) => {
    setStatus(s);
    setPage(1);
  };

  // 渲染状态标签
  const renderStatus = (statusKey: string) => {
    const cfg = statusConfig[statusKey] || statusConfig.pending;
    return (
      <Tag
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

  // 卡片式订单列表项
  const OrderCard = ({ order }: { order: any }) => {
    const courierCfg = courierConfig[order.courier] || { color: '#8c8c8c', bg: '#f5f5f5', label: order.courier || '未知' };

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
      onClick={() => showDetail(order.id)}
      hoverable
      >
        <Row gutter={16}>
          <Col span={2}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: courierCfg.bg, color: courierCfg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>
              <EnvironmentOutlined />
            </div>
          </Col>
          <Col span={18}>
            <div>
              <Space size="small" align="center">
                <Text strong style={{ fontFamily: 'monospace', fontSize: 16, color: '#333' }}>{order.trackingNumber}</Text>
                <Tag color="default" style={{ fontSize: 11 }}>{courierCfg.label}</Tag>
              </Space>
              <div style={{ marginTop: 6 }}>
                <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                  <Text style={{ fontSize: 13 }}>
                    {order.receiverName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {order.receiverPhone}
                  </Text>
                </Space>
              </div>
              {order.receiverAddress && (
                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 1, expandable: false }}
                  style={{ fontSize: 12, margin: '4px 0 0 0' }}
                >
                  <EnvironmentOutlined style={{ marginRight: 4, fontSize: 11 }} />
                  {order.receiverAddress}
                </Paragraph>
              )}
            </div>
          </Col>
          <Col span={4}>
            <Space direction="vertical" align="end" style={{ width: '100%' }}>
              <Space align="center">
                {renderStatus(order.status)}
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <ClockCircleOutlined style={{ marginRight: 2 }} />
                {dayjs(order.createdAt).fromNow()}
              </Text>
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
          <Title level={4} style={{ margin: 0 }}>📦 订单管理</Title>
          <Text type="secondary">管理订单信息，跟踪物流状态</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建订单</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="订单总数"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff7e6' }}>
            <Statistic
              title="待揽收"
              value={stats.pending}
              prefix={<InboxOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#e6fffb' }}>
            <Statistic
              title="运输中"
              value={stats.transit}
              prefix={<RocketFilled style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f9f0ff' }}>
            <Statistic
              title="派送中"
              value={stats.delivery}
              prefix={<CarryOutFilled style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f6ffed' }}>
            <Statistic
              title="已签收"
              value={stats.delivered}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff1f0' }}>
            <Statistic
              title="异常件"
              value={stats.exception}
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
          <Button
            type={status === '' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('')}
          >全部</Button>
          <Button
            type={status === 'pending' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('pending')}
          >待揽收</Button>
          <Button
            type={status === 'transit' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('transit')}
          >运输中</Button>
          <Button
            type={status === 'delivery' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('delivery')}
          >派送中</Button>
          <Button
            type={status === 'delivered' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('delivered')}
          >已签收</Button>
          <Button
            type={status === 'exception' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('exception')}
          >异常件</Button>
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <Text strong>高级筛选：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="运单号 / 收件人"
            style={{ width: 220 }}
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
          />
          <Select
            placeholder="快递公司"
            allowClear
            style={{ width: 140 }}
            value={courier || undefined}
            onChange={v => { setCourier(v); setPage(1); }}
          >
            {Object.entries(courierConfig).map(([k, v]) => (
              <Option key={k} value={k}>{v.label}</Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* 订单列表 */}
      <Card
        title={
          <Space>
            <span>订单列表</span>
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
          <Empty description="暂无订单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div>
            {data.map(order => (
              <OrderCard key={order.id} order={order} />
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

      {/* 订单详情抽屉 */}
      <Drawer
        open={visible}
        onClose={() => setVisible(false)}
        width={640}
        title={
          <Space>
            <span>订单详情</span>
            {detail && <Tag style={{ fontFamily: 'monospace' }}>{detail.trackingNumber}</Tag>}
          </Space>
        }
      >
        {detail && (
          <div>
            {/* 基本信息 */}
            <Card size="small" title="基本信息" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Descriptions column={2} size="small" colon>
                <Descriptions.Item label="运单号" span={2}>
                  <Text strong style={{ fontFamily: 'monospace', fontSize: 15 }}>{detail.trackingNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="快递公司">
                  <Tag
                    style={{ background: courierConfig[detail.courier]?.bg, color: courierConfig[detail.courier]?.color, border: 'none' }}
                  >
                    <EnvironmentOutlined /> {courierConfig[detail.courier]?.label || detail.courier}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {renderStatus(detail.status)}
                </Descriptions.Item>
                <Descriptions.Item label="收件人">
                  <Space>
                    <Text>{detail.receiverName}</Text>
                    <Tooltip title="拨打电话">
                      <Button size="small" icon={<PhoneOutlined />} onClick={() => message.info(`拨打 ${detail.receiverPhone}`)} />
                    </Tooltip>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="收件电话">{detail.receiverPhone}</Descriptions.Item>
                <Descriptions.Item label="收件地址" span={2}>{detail.receiverAddress}</Descriptions.Item>
                <Descriptions.Item label="寄件人">{detail.senderName}</Descriptions.Item>
                <Descriptions.Item label="寄件电话">{detail.senderPhone}</Descriptions.Item>
                <Descriptions.Item label="寄件地址" span={2}>{detail.senderAddress}</Descriptions.Item>
                <Descriptions.Item label="重量">{detail.weight} kg</Descriptions.Item>
                <Descriptions.Item label="预计送达">{detail.estimatedDelivery ? dayjs(detail.estimatedDelivery).format('YYYY-MM-DD') : '—'}</Descriptions.Item>
                <Descriptions.Item label="创建时间" span={2}>{dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 操作选项 */}
            <Card size="small" title="更新状态" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Space wrap>
              {Object.entries(statusConfig).map(([k, v]) => (
                <Button
                  key={k}
                  size="small"
                  onClick={() => { updateStatus(detail.id, k)}}
                  style={{
                    borderColor: v.border,
                    color: v.color,
                    background: detail.status === k ? v.bg : undefined,
                  }}
                >
                  {v.label}
                </Button>
              ))}
              </Space>
            </Card>

            {/* 物流轨迹 */}
            <Card size="small" title="🚚 物流轨迹" style={{ borderRadius: 8 }}>
              <Timeline
                items={(detail.tracking || []).sort((a: any, b: any) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf()).map((t: any) => ({
                  color: statusConfig[t.status]?.color || 'blue',
                  children: (
                    <div>
                      <Text strong>{t.status}</Text>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>{dayjs(t.time).format('YYYY-MM-DD HH:mm')} · {t.location}</div>
                      <div style={{ marginTop: 2 }}>{t.description}</div>
                    </div>
                  )
                })).concat([{
                  color: 'gray',
                  children: (
                    <div>
                      <Text strong>订单创建</Text>
                      <div style={{ color: '#8c8c8c', fontSize: 12 }}>{dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                    </div>
                  )
                }])
                }
              />
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建订单 */}
      <Modal
        open={createOpen}
        title="📝 新建订单"
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="创建"
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="courier" label="快递公司" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  {Object.entries(courierConfig).map(([k, v]) => (
                    <Option key={k} value={k}>
                      <Space>
                        <span style={{ color: v.color }}>●</span>
                        {v.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trackingNumber" label="运单号（可选，留空自动生成）">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="receiverName" label="收件人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receiverPhone" label="收件电话" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="receiverAddress" label="收件地址" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="senderName" label="寄件人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="senderPhone" label="寄件电话" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="senderAddress" label="寄件地址" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="weight" label="重量 (kg)" initialValue={1}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
