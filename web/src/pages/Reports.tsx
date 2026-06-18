import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Space, Typography, Spin, Table, Tag, Avatar, Progress, Empty, Tabs } from 'antd';
import { PhoneOutlined, FileDoneOutlined, TeamOutlined, InboxOutlined, SolutionOutlined, TrophyOutlined, RiseOutlined, StarFilled, UserOutlined, ClockCircleOutlined, RocketOutlined, AlertOutlined, MessageOutlined } from '@ant-design/icons';
import { Column, Pie, Line } from '@ant-design/charts';
import dayjs from 'dayjs';
import api from '../utils/api';

const { Title, Text } = Typography;

export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any>({ byStatus: [], byPriority: [], byType: [] });
  const [orders, setOrders] = useState<any>({ byStatus: [], byCourier: [] });
  const [agents, setAgents] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/tickets/summary').catch(() => ({ data: {} })),
      api.get('/orders/summary').catch(() => ({ data: {} })),
      api.get('/users', { params: { pageSize: 50 } }).catch(() => ({ data: { rows: [] } })),
      api.get('/calls', { params: { pageSize: 200 } }).catch(() => ({ data: { rows: [] } })),
      api.get('/customers', { params: { pageSize: 50 } }).catch(() => ({ data: { rows: [] } })),
      api.get('/reports/dashboard').catch(() => ({ data: {} })),
    ]).then(([t, o, u, c, cust, dash]) => {
      setTickets(t.data || { byStatus: [], byPriority: [], byType: [] });
      setOrders(o.data || { byStatus: [], byCourier: [] });
      setAgents((u.data?.rows || []).filter((a: any) => a.role === 'agent'));
      setCalls(c.data?.rows || []);
      setCustomers(cust.data?.rows || []);
      setSummary(dash.data?.summary || {});
    }).finally(() => setLoading(false));
  }, []);

  // 状态映射
  const ticketStatusMap: any = { open: '待处理', assigned: '已分配', processing: '处理中', waiting: '待回复', resolved: '已解决', closed: '已关闭', ai_resolved: 'AI已处理' };
  const ticketStatusColor: any = { open: '#ff4d4f', assigned: '#fa8c16', processing: '#1890ff', waiting: '#722ed1', resolved: '#52c41a', closed: '#8c8c8c', ai_resolved: '#13c2c2' };
  const orderStatusMap: any = { pending: '待揽收', collected: '已揽收', transit: '运输中', delivery: '派送中', delivered: '已签收', exception: '异常件', returned: '已退回' };
  const orderStatusColor: any = { pending: '#fa8c16', collected: '#1890ff', transit: '#13c2c2', delivery: '#722ed1', delivered: '#52c41a', exception: '#ff4d4f', returned: '#8c8c8c' };
  const courierMap: any = { sto: '申通', yto: '圆通', zto: '中通', zjs: '宅急送', bestexpress: '百世' };
  const ticketTypeMap: any = { complaint: '投诉', query: '查询', service: '服务', claim: '理赔', other: '其他' };
  const priorityMap: any = { urgent: '紧急', high: '高', medium: '中', low: '低' };

  // 计算总通话时长（秒）
  const totalCallDuration = calls.reduce((s: number, c: any) => s + (c.duration || 0), 0);
  const totalCallHours = Math.round(totalCallDuration / 3600 * 10) / 10;
  const connectedCalls = calls.filter((c: any) => c.status === 'connected').length;
  const connectedRate = calls.length > 0 ? Math.round(connectedCalls / calls.length * 100) : 0;

  // 平均满意度
  const avgSatisfaction = agents.length > 0
    ? Math.round(agents.reduce((s: number, a: any) => s + Number(a.satisfaction || 0), 0) / agents.length * 10) / 10
    : 0;

  // 坐席绩效榜：按工单数降序
  const agentRanking = [...agents]
    .sort((a, b) => (b.totalTickets || 0) - (a.totalTickets || 0))
    .slice(0, 10)
    .map((a, idx) => ({ ...a, rank: idx + 1 }));

  // 通话趋势：按天聚合
  const callTrendMap: Record<string, number> = {};
  calls.forEach((c: any) => {
    const day = dayjs(c.startTime).format('MM-DD');
    callTrendMap[day] = (callTrendMap[day] || 0) + 1;
  });
  const callTrendData = Object.entries(callTrendMap)
    .map(([date, count]) => ({ date, 通话量: count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  // 工单类型饼图
  const ticketTypeData = (tickets.byType || []).map((x: any) => ({
    type: ticketTypeMap[x.type] || x.type,
    value: x.count,
  }));

  // 优先级分布
  const priorityData = (tickets.byPriority || []).map((x: any) => ({
    priority: priorityMap[x.priority] || x.priority,
    value: x.count,
  }));

  // 快递公司分布
  const courierData = (orders.byCourier || []).map((x: any) => ({
    courier: courierMap[x.courier] || x.courier,
    value: x.count,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>📊 报表中心</Title>
          <Text type="secondary">全方位业务数据分析与坐席绩效评估</Text>
        </div>
        <Space>
          <Tag color="blue">实时数据</Tag>
          <Text type="secondary">更新于 {dayjs().format('YYYY-MM-DD HH:mm')}</Text>
        </Space>
      </div>

      {/* 顶部 KPI 卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none', borderRadius: 8 }} loading={loading}>
            <Statistic title="工单总数" value={summary.totalTickets || 0} prefix={<FileDoneOutlined style={{ color: '#1890ff', fontSize: 22 }} />} valueStyle={{ color: '#1890ff', fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none', borderRadius: 8 }} loading={loading}>
            <Statistic title="订单总数" value={summary.totalOrders || 0} prefix={<InboxOutlined style={{ color: '#52c41a', fontSize: 22 }} />} valueStyle={{ color: '#52c41a', fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%)', border: 'none', borderRadius: 8 }} loading={loading}>
            <Statistic title="客户总数" value={summary.totalCustomers || 0} prefix={<TeamOutlined style={{ color: '#fa8c16', fontSize: 22 }} />} valueStyle={{ color: '#fa8c16', fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card style={{ background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none', borderRadius: 8 }} loading={loading}>
            <Statistic title="坐席总数" value={agents.length} prefix={<SolutionOutlined style={{ color: '#722ed1', fontSize: 22 }} />} valueStyle={{ color: '#722ed1', fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', border: 'none', borderRadius: 8 }} loading={loading}>
            <Statistic title="待处理工单" value={summary.pendingTickets || 0} prefix={<AlertOutlined style={{ color: '#ff4d4f', fontSize: 22 }} />} valueStyle={{ color: '#ff4d4f', fontWeight: 600 }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card style={{ background: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)', border: 'none', borderRadius: 8 }} loading={loading}>
            <Statistic title="总通话时长" value={totalCallHours} suffix="小时" prefix={<PhoneOutlined style={{ color: '#13c2c2', fontSize: 22 }} />} valueStyle={{ color: '#13c2c2', fontWeight: 600 }} />
          </Card>
        </Col>
      </Row>

      {/* 通话接通率 + 平均满意度 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="📞 通话接通率" loading={loading} style={{ borderRadius: 8 }}>
            <Row align="middle" gutter={16}>
              <Col span={10}>
                <Progress
                  type="circle"
                  percent={connectedRate}
                  strokeColor={connectedRate >= 80 ? '#52c41a' : connectedRate >= 60 ? '#faad14' : '#ff4d4f'}
                  size={140}
                />
              </Col>
              <Col span={14}>
                <Statistic title="总通话数" value={calls.length} prefix={<PhoneOutlined />} />
                <Statistic title="已接通" value={connectedCalls} valueStyle={{ color: '#52c41a' }} prefix={<RocketOutlined />} style={{ marginTop: 8 }} />
                <Statistic title="未接通" value={calls.length - connectedCalls} valueStyle={{ color: '#ff4d4f' }} prefix={<AlertOutlined />} style={{ marginTop: 8 }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="⭐ 平均满意度" loading={loading} style={{ borderRadius: 8 }}>
            <Row align="middle" gutter={16}>
              <Col span={10}>
                <Progress
                  type="circle"
                  percent={(avgSatisfaction / 5) * 100}
                  format={() => <span style={{ fontSize: 32, color: '#faad14' }}>{avgSatisfaction.toFixed(1)}</span>}
                  strokeColor="#faad14"
                  size={140}
                />
              </Col>
              <Col span={14}>
                <Statistic title="满分" value={5} suffix="/ 5" prefix={<StarFilled style={{ color: '#faad14' }} />} />
                <Statistic title="坐席平均处理时长" value={agents.length > 0 ? (agents.reduce((s: number, a: any) => s + Number(a.avgHandleTime || 0), 0) / agents.length).toFixed(1) : 0} suffix="分" prefix={<ClockCircleOutlined />} style={{ marginTop: 8 }} />
                <Statistic title="坐席总工单" value={agents.reduce((s: number, a: any) => s + (a.totalTickets || 0), 0)} prefix={<FileDoneOutlined />} style={{ marginTop: 8 }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 工单分析 + 订单分析 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="🎫 工单状态分布" loading={loading} style={{ borderRadius: 8 }}>
            <Row gutter={[12, 12]}>
              {(tickets.byStatus || []).map((s: any) => (
                <Col span={8} key={s.status}>
                  <Card size="small" style={{ borderRadius: 6, border: `1px solid ${ticketStatusColor[s.status] || '#d9d9d9'}30`, background: `${ticketStatusColor[s.status] || '#8c8c8c'}10` }}>
                    <Statistic
                      title={<span style={{ color: ticketStatusColor[s.status] || '#8c8c8c' }}>{ticketStatusMap[s.status] || s.status}</span>}
                      value={s.count}
                      valueStyle={{ color: ticketStatusColor[s.status] || '#8c8c8c', fontSize: 24, fontWeight: 600 }}
                    />
                  </Card>
                </Col>
              ))}
              {(tickets.byStatus || []).length === 0 && <Col span={24}><Empty description="暂无工单数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /></Col>}
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text strong>📊 类型分布</Text>
              {ticketTypeData.length > 0 ? <Pie data={ticketTypeData} angleField="value" colorField="type" radius={0.85} innerRadius={0.5} height={240} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="📦 订单状态分布" loading={loading} style={{ borderRadius: 8 }}>
            <Row gutter={[12, 12]}>
              {(orders.byStatus || []).map((s: any) => (
                <Col span={8} key={s.status}>
                  <Card size="small" style={{ borderRadius: 6, border: `1px solid ${orderStatusColor[s.status] || '#d9d9d9'}30`, background: `${orderStatusColor[s.status] || '#8c8c8c'}10` }}>
                    <Statistic
                      title={<span style={{ color: orderStatusColor[s.status] || '#8c8c8c' }}>{orderStatusMap[s.status] || s.status}</span>}
                      value={s.count}
                      valueStyle={{ color: orderStatusColor[s.status] || '#8c8c8c', fontSize: 24, fontWeight: 600 }}
                    />
                  </Card>
                </Col>
              ))}
              {(orders.byStatus || []).length === 0 && <Col span={24}><Empty description="暂无订单数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /></Col>}
            </Row>
            <div style={{ marginTop: 16 }}>
              <Text strong>🚚 快递公司分布</Text>
              {courierData.length > 0 ? <Column data={courierData} xField="courier" yField="value" colorField="courier" height={240} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 通话趋势 + 优先级分布 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="📈 通话量趋势" loading={loading} style={{ borderRadius: 8 }}>
            {callTrendData.length > 0 ? <Line data={callTrendData} xField="date" yField="通话量" height={280} point={{ size: 5 }} color="#1677ff" /> : <Empty description="暂无通话数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="🔥 工单优先级分布" loading={loading} style={{ borderRadius: 8 }}>
            {priorityData.length > 0 ? <Column data={priorityData} xField="priority" yField="value" colorField="priority" height={280} /> : <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
      </Row>

      {/* 坐席绩效榜 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={<Space><TrophyOutlined style={{ color: '#faad14' }} /><span>🏆 坐席绩效排行榜（Top 10）</span></Space>}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            <Table
              size="middle"
              dataSource={agentRanking}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: '排名', dataIndex: 'rank', width: 80,
                  render: (r: number) => {
                    if (r === 1) return <Tag color="gold" style={{ fontSize: 14, padding: '2px 10px' }}>🥇 1</Tag>;
                    if (r === 2) return <Tag color="silver" style={{ fontSize: 14, padding: '2px 10px' }}>🥈 2</Tag>;
                    if (r === 3) return <Tag color="orange" style={{ fontSize: 14, padding: '2px 10px' }}>🥉 3</Tag>;
                    return <Tag style={{ fontSize: 13 }}>{r}</Tag>;
                  }
                },
                {
                  title: '坐席', dataIndex: 'realName', width: 150,
                  render: (n: string, r: any) => (
                    <Space>
                      <Avatar size="small" style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
                      <span>{n}</span>
                    </Space>
                  )
                },
                { title: '工单数', dataIndex: 'totalTickets', width: 110, sorter: (a: any, b: any) => a.totalTickets - b.totalTickets, render: (v: number) => <Tag color="blue" icon={<FileDoneOutlined />}>{v || 0}</Tag> },
                { title: '通话数', dataIndex: 'totalCalls', width: 110, render: (v: number) => <Tag color="green" icon={<PhoneOutlined />}>{v || 0}</Tag> },
                { title: '平均处理时长', dataIndex: 'avgHandleTime', width: 140, render: (v: number) => <span><ClockCircleOutlined /> {Number(v || 0).toFixed(1)} 分</span> },
                {
                  title: '客户满意度', dataIndex: 'satisfaction', width: 220,
                  render: (v: number) => (
                    <Space>
                      <StarFilled style={{ color: '#faad14' }} />
                      <Progress
                        percent={Math.round((Number(v || 0) / 5) * 100)}
                        size="small"
                        style={{ width: 120 }}
                        strokeColor="#faad14"
                        format={p => <span style={{ color: '#faad14' }}>{Number(v || 0).toFixed(1)}</span>}
                      />
                    </Space>
                  )
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
