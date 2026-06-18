import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress, Space, Button, Typography } from 'antd';
import { InboxOutlined, PhoneOutlined, TeamOutlined, FileDoneOutlined, WarningOutlined, SyncOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/charts';
import dayjs from 'dayjs';
import api from '../utils/api';
import KnowledgeAssistant from '../components/KnowledgeAssistant';

const { Title } = Typography;

export default function Dashboard() {
  const [stats, setStats] = useState<any>({ summary: {}, ticketByType: [], orderByStatus: [], callsTrend: [], agents: [] });
  const [loading, setLoading] = useState(false);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/tickets', { params: { pageSize: 10 } }),
      ]);
      setStats(d.data);
      setRecentTickets(t.data?.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const ticketConfig = {
    data: (Array.isArray(stats.ticketByType) ? stats.ticketByType : []).map((x: any) => ({ type: x.type === 'complaint' ? '投诉' : x.type === 'query' ? '查询' : x.type === 'service' ? '服务' : x.type === 'claim' ? '理赔' : x.type, value: x.count })),
    angleField: 'type',
    colorField: 'type',
    radiusField: 'value',
    innerRadius: 0.4,
    height: 260,
  };

  const callTrendConfig = {
    data: (Array.isArray(stats.callsTrend) ? stats.callsTrend : []).map((x: any) => ({ date: dayjs(x.day || x.startTime).format('MM-DD'), 通话量: x.count })),
    xField: 'date',
    yField: '通话量',
    label: { position: 'top' },
    height: 260,
    color: '#1677ff',
  };

  const statusColor: any = { open: 'red', assigned: 'orange', processing: 'blue', waiting: 'purple', resolved: 'green', closed: 'default' };
  const statusLabel: any = { open: '待处理', assigned: '已分配', processing: '处理中', waiting: '待回复', resolved: '已解决', closed: '已关闭' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>📊 运营仪表盘</Title>
        <Space><Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>刷新数据</Button></Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6} lg={4}><Card className="stat-card" loading={loading} style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: 'none' }}><Statistic title="订单总数" value={stats.summary?.totalOrders || 0} prefix={<InboxOutlined style={{ color: '#1890ff', fontSize: 22 }} />} /></Card></Col>
        <Col xs={12} sm={8} md={6} lg={4}><Card className="stat-card" loading={loading} style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', border: 'none' }}><Statistic title="工单总数" value={stats.summary?.totalTickets || 0} prefix={<FileDoneOutlined style={{ color: '#52c41a', fontSize: 22 }} />} /></Card></Col>
        <Col xs={12} sm={8} md={6} lg={4}><Card className="stat-card" loading={loading} style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffe58f 100%)', border: 'none' }}><Statistic title="客户总数" value={stats.summary?.totalCustomers || 0} prefix={<TeamOutlined style={{ color: '#faad14', fontSize: 22 }} />} /></Card></Col>
        <Col xs={12} sm={8} md={6} lg={4}><Card className="stat-card" loading={loading} style={{ background: 'linear-gradient(135deg, #f9f0ff 0%, #d3adf7 100%)', border: 'none' }}><Statistic title="通话总数" value={stats.summary?.totalCalls || 0} prefix={<PhoneOutlined style={{ color: '#722ed1', fontSize: 22 }} />} /></Card></Col>
        <Col xs={12} sm={8} md={6} lg={4}><Card className="stat-card" loading={loading} style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', border: 'none' }}><Statistic title="待处理工单" value={stats.summary?.pendingTickets || 0} valueStyle={{ color: '#ff4d4f' }} prefix={<WarningOutlined style={{ fontSize: 22 }} />} /></Card></Col>
        <Col xs={12} sm={8} md={6} lg={4}><Card className="stat-card" loading={loading} style={{ background: 'linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%)', border: 'none' }}><Statistic title="今日接听" value={stats.summary?.connectedCalls || 0} valueStyle={{ color: '#13c2c2' }} prefix={<PhoneOutlined style={{ fontSize: 22 }} />} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={16}>
          <Card className="page-card" title="📞 近 7 日通话趋势" loading={loading}>
            {(Array.isArray(stats.callsTrend) && stats.callsTrend.length > 0) ? <Column {...callTrendConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>暂无数据</div>}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="page-card" title="📋 工单类型分布" loading={loading}>
            {(Array.isArray(stats.ticketByType) && stats.ticketByType.length > 0) ? <Pie {...ticketConfig} /> : <div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>暂无数据</div>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={14}>
          <Card className="page-card" title="🆕 最新工单（Top 10）" loading={loading}>
            <Table
              size="small"
              dataSource={recentTickets}
              rowKey="id"
              pagination={false}
              columns={[
                { title: '#', dataIndex: 'id', width: 60 },
                { title: '类型', dataIndex: 'type', width: 80, render: (t: string) => <Tag color={t === 'complaint' ? 'red' : t === 'claim' ? 'orange' : 'blue'}>{t === 'complaint' ? '投诉' : t === 'query' ? '查询' : t === 'service' ? '服务' : t === 'claim' ? '理赔' : t}</Tag> },
                { title: '标题', dataIndex: 'title' },
                { title: '优先级', dataIndex: 'priority', width: 80, render: (p: string) => <Tag color={p === 'high' || p === 'urgent' ? 'red' : p === 'medium' ? 'orange' : 'green'}>{p === 'urgent' ? '紧急' : p === 'high' ? '高' : p === 'medium' ? '中' : '低'}</Tag> },
                { title: '状态', dataIndex: 'status', width: 90, render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card className="page-card" title="👥 坐席绩效排行" loading={loading}>
            <Table
              size="small"
              dataSource={Array.isArray(stats.agents) ? stats.agents : []}
              rowKey="id"
              pagination={false}
              columns={[
                { title: '坐席', dataIndex: 'realName', render: (n: string, r: any) => `${n}（${r.id}）` },
                { title: '处理时长', dataIndex: 'avgHandleTime', render: (v: any) => <span>{Number(v || 0).toFixed(1)} 分钟</span> },
                { title: '满意度', dataIndex: 'satisfaction', render: (v: any) => <Progress percent={Math.round((Number(v || 0) * 20))} size="small" style={{ minWidth: 120 }} /> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24}>
          <KnowledgeAssistant />
        </Col>
      </Row>
    </div>
  );
}
