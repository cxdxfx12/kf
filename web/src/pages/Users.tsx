import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Tag, Button, Space, Input, Select, Modal, Form, message,
  Drawer, Descriptions, Avatar, Typography, Row, Col, Spin, Divider,
  Badge, Statistic, Progress, Tooltip, Popconfirm, Empty, Alert, Switch
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, UserOutlined,
  EditOutlined, PhoneOutlined, TeamOutlined, CrownFilled, SolutionOutlined,
  ClockCircleOutlined, CheckCircleOutlined, StopOutlined, MessageOutlined,
  RiseOutlined, StopTwoTone, MailOutlined, CalendarOutlined
} from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 角色配置
const roleConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  admin: { color: '#ff4d4f', bg: '#fff1f0', border: '#ffccc7', icon: <CrownFilled />, label: '管理员' },
  manager: { color: '#fa8c16', bg: '#fff7e6', border: '#ffd591', icon: <SolutionOutlined />, label: '主管' },
  agent: { color: '#1890ff', bg: '#e6f7ff', border: '#91d5ff', icon: <UserOutlined />, label: '坐席' },
};

// 状态配置
const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: '#52c41a', bg: '#f6ffed', label: '启用' },
  inactive: { color: '#8c8c8c', bg: '#f5f5f5', label: '禁用' },
};

// 头像背景色池
const avatarColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#fa541c', '#eb2f96'];
const getAvatarColor = (id: number) => avatarColors[(id || 0) % avatarColors.length];

export default function Users() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 统计数据
  const [stats, setStats] = useState({
    total: 0, admins: 0, managers: 0, agents: 0, active: 0, inactive: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { page, pageSize, keyword, role } });
      const rows = res.data?.rows || [];
      setData(rows);
      setTotal(res.data?.total || 0);

      // 计算统计数据
      setStats({
        total: res.data?.total || 0,
        admins: rows.filter((u: any) => u.role === 'admin').length,
        managers: rows.filter((u: any) => u.role === 'manager').length,
        agents: rows.filter((u: any) => u.role === 'agent').length,
        active: rows.filter((u: any) => u.status === 'active').length,
        inactive: rows.filter((u: any) => u.status === 'inactive').length,
      });
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setEditOpen(true);
    form.resetFields();
  };

  const openEdit = (row: any) => {
    setEditing(row);
    setEditOpen(true);
    form.setFieldsValue(row);
  };

  const showDetail = async (row: any) => {
    setDetail(row);
    setDetailOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, values);
        message.success('已更新');
      } else {
        await api.post('/users', values);
        message.success('用户创建成功');
      }
      setEditOpen(false);
      fetchData();
    } catch (err: any) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.put(`/users/${user.id}`, { status: newStatus });
      message.success(newStatus === 'active' ? '已启用' : '已禁用');
      fetchData();
    } catch (err: any) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const quickFilter = (r: string) => {
    setRole(r === role ? '' : r);
    setPage(1);
  };

  // 渲染角色
  const renderRole = (r: string) => {
    const cfg = roleConfig[r] || roleConfig.agent;
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

  // 渲染状态
  const renderStatus = (s: string) => {
    const cfg = statusConfig[s] || statusConfig.inactive;
    return (
      <Tag
        color={s === 'active' ? 'success' : 'default'}
        style={{ minWidth: 50, textAlign: 'center' }}
      >
        {cfg.label}
      </Tag>
    );
  };

  // 计算工作量（用 totalTickets + totalCalls）
  const calcWorkload = (user: any) => {
    const total = (user.totalTickets || 0) + (user.totalCalls || 0);
    if (total > 200) return { percent: 100, color: '#ff4d4f', text: '繁忙' };
    if (total > 100) return { percent: 70, color: '#fa8c16', text: '忙碌' };
    if (total > 50) return { percent: 40, color: '#1890ff', text: '正常' };
    return { percent: 15, color: '#52c41a', text: '空闲' };
  };

  // 用户卡片
  const UserCard = ({ user }: { user: any }) => {
    const roleCfg = roleConfig[user.role] || roleConfig.agent;
    const workload = calcWorkload(user);
    const isActive = user.status === 'active';

    return (
      <Card
        size="small"
        className="user-card"
        style={{
          marginBottom: 12,
          borderRadius: 8,
          cursor: 'pointer',
          border: `1px solid ${isActive ? '#f0f0f0' : '#d9d9d9'}`,
          background: isActive ? '#fff' : '#fafafa',
        }}
        styles={{ body: { padding: 16 } }}
        hoverable
        onClick={() => showDetail(user)}
      >
        <Row gutter={12} align="middle">
          <Col flex="60px">
            <Badge
              status={isActive ? 'success' : 'default'}
              offset={[-4, 56]}
            >
              <Avatar
                size={48}
                style={{
                  backgroundColor: getAvatarColor(user.id),
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {(user.realName || user.username || '?').charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </Col>
          <Col flex="auto">
            <Space>
              <Text strong style={{ fontSize: 15 }}>{user.realName}</Text>
              {renderRole(user.role)}
              {renderStatus(user.status)}
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <UserOutlined style={{ marginRight: 4 }} />
                {user.username}
                <Divider type="vertical" />
                <PhoneOutlined style={{ marginRight: 4 }} />
                {user.phone || '—'}
              </Text>
            </div>
            <div style={{ marginTop: 6 }}>
              <Space size="middle">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <MessageOutlined style={{ marginRight: 4, color: '#1890ff' }} />
                  {user.totalTickets || 0} 工单
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                  {user.totalCalls || 0} 通话
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
                  {user.avgHandleTime ? `${Number(user.avgHandleTime).toFixed(1)}分` : '—'}
                </Text>
              </Space>
            </div>
          </Col>
          <Col flex="180px">
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>工作量</Text>
                <Text style={{ fontSize: 11, color: workload.color, fontWeight: 500 }}>{workload.text}</Text>
              </div>
              <Progress
                percent={workload.percent}
                strokeColor={workload.color}
                showInfo={false}
                size="small"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  满意度
                </Text>
                <Text style={{ fontSize: 11, color: '#faad14' }}>
                  {user.satisfaction ? `⭐ ${Number(user.satisfaction).toFixed(1)}` : '—'}
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div>
      {/* 顶部标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>👤 坐席管理</Title>
          <Text type="secondary">管理系统坐席账号、角色权限和绩效</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建坐席</Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="坐席总数"
              value={stats.total}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff1f0' }}>
            <Statistic
              title="管理员"
              value={stats.admins}
              prefix={<CrownFilled style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#fff7e6' }}>
            <Statistic
              title="主管"
              value={stats.managers}
              prefix={<SolutionOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#e6f7ff' }}>
            <Statistic
              title="坐席"
              value={stats.agents}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f6ffed' }}>
            <Statistic
              title="启用中"
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderRadius: 8, background: '#f5f5f5' }}>
            <Statistic
              title="已禁用"
              value={stats.inactive}
              prefix={<StopOutlined style={{ color: '#8c8c8c' }} />}
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
            type={role === '' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('')}
          >全部</Button>
          <Button
            type={role === 'admin' ? 'primary' : 'default'}
            size="small"
            danger={role !== 'admin'}
            onClick={() => quickFilter('admin')}
          >管理员</Button>
          <Button
            type={role === 'manager' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('manager')}
          >主管</Button>
          <Button
            type={role === 'agent' ? 'primary' : 'default'}
            size="small"
            onClick={() => quickFilter('agent')}
          >坐席</Button>
          <Divider type="vertical" style={{ margin: '0 8px' }} />
          <Text strong>高级筛选：</Text>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="用户名 / 姓名 / 电话"
            style={{ width: 240 }}
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
          />
          <Button type="primary" onClick={fetchData}>查询</Button>
        </Space>
      </Card>

      {/* 用户列表 */}
      <Card
        title={
          <Space>
            <span>坐席列表</span>
            <Badge count={total} style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={<Text type="secondary">共 {total} 位</Text>}
        style={{ borderRadius: 8 }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" description="加载中..." />
          </div>
        ) : data.length === 0 ? (
          <Empty description="暂无坐席" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div>
            {data.map(user => <UserCard key={user.id} user={user} />)}
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

      {/* 用户详情抽屉 */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={560}
        title={
          <Space>
            <span>坐席详情</span>
            {detail && renderRole(detail.role)}
            {detail && renderStatus(detail.status)}
          </Space>
        }
        extra={
          detail && (
            <Space>
              <Button
                icon={<EditOutlined />}
                onClick={() => { setDetailOpen(false); openEdit(detail); }}
              >编辑</Button>
              <Popconfirm
                title={detail.status === 'active' ? '确认禁用此坐席？' : '确认启用此坐席？'}
                onConfirm={() => handleToggleStatus(detail)}
              >
                <Button
                  danger={detail.status === 'active'}
                  icon={detail.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
                >
                  {detail.status === 'active' ? '禁用' : '启用'}
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        {detail && (
          <div>
            {/* 个人信息卡 */}
            <Card size="small" style={{ borderRadius: 8, marginBottom: 12, textAlign: 'center' }}>
              <Avatar
                size={80}
                style={{
                  backgroundColor: getAvatarColor(detail.id),
                  fontSize: 32,
                  fontWeight: 600,
                }}
              >
                {(detail.realName || detail.username || '?').charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ marginTop: 12 }}>
                <Title level={4} style={{ margin: 0 }}>{detail.realName}</Title>
                <Text type="secondary">@{detail.username}</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="工单数"
                    value={detail.totalTickets || 0}
                    valueStyle={{ fontSize: 18, color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="通话数"
                    value={detail.totalCalls || 0}
                    valueStyle={{ fontSize: 18, color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="满意度"
                    value={detail.satisfaction || 0}
                    precision={1}
                    valueStyle={{ fontSize: 18, color: '#faad14' }}
                    suffix={<span style={{ fontSize: 12 }}>/5</span>}
                  />
                </Col>
              </Row>
            </Card>

            {/* 基本信息 */}
            <Card size="small" title="📋 基本信息" style={{ marginBottom: 12, borderRadius: 8 }}>
              <Descriptions column={1} size="small" colon>
                <Descriptions.Item label={<><UserOutlined /> 用户名</>}>
                  {detail.username}
                </Descriptions.Item>
                <Descriptions.Item label={<><UserOutlined /> 真实姓名</>}>
                  {detail.realName}
                </Descriptions.Item>
                <Descriptions.Item label={<><PhoneOutlined /> 联系电话</>}>
                  <Space>
                    <Text>{detail.phone || '—'}</Text>
                    {detail.phone && (
                      <Button size="small" icon={<PhoneOutlined />} onClick={() => message.info(`拨打 ${detail.phone}`)}>拨打</Button>
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label={<><MailOutlined /> 邮箱</>}>
                  {detail.email || '—'}
                </Descriptions.Item>
                <Descriptions.Item label={<><CrownFilled /> 角色</>}>
                  {renderRole(detail.role)}
                </Descriptions.Item>
                <Descriptions.Item label={<><CheckCircleOutlined /> 状态</>}>
                  <Switch
                    checked={detail.status === 'active'}
                    onChange={() => handleToggleStatus(detail)}
                    checkedChildren="启用"
                    unCheckedChildren="禁用"
                  />
                </Descriptions.Item>
                <Descriptions.Item label={<><CalendarOutlined /> 创建时间</>}>
                  {detail.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss') : '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 绩效信息 */}
            <Card size="small" title="📊 绩效数据" style={{ borderRadius: 8 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="总工单数"
                    value={detail.totalTickets || 0}
                    prefix={<MessageOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="总通话数"
                    value={detail.totalCalls || 0}
                    prefix={<PhoneOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="平均处理时长"
                    value={detail.avgHandleTime || 0}
                    precision={1}
                    suffix="分"
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="客户满意度"
                    value={detail.satisfaction || 0}
                    precision={1}
                    suffix="/ 5"
                    prefix={<RiseOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <Text type="secondary">工作量</Text>
                <Progress
                  percent={calcWorkload(detail).percent}
                  strokeColor={calcWorkload(detail).color}
                  format={() => calcWorkload(detail).text}
                />
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑坐席 */}
      <Modal
        open={editOpen}
        title={editing ? `✏️ 编辑坐席 - ${editing.realName}` : '➕ 新建坐席'}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        okText="保存"
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editing && (
            <>
              <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }]}>
                <Input prefix={<UserOutlined />} placeholder="例如: agent7" />
              </Form.Item>
              <Form.Item name="password" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
                <Input.Password prefix={<StopTwoTone />} placeholder="登录密码（建议6位以上）" />
              </Form.Item>
            </>
          )}
          {editing && (
            <Form.Item name="password" label="新密码（留空不修改）">
              <Input.Password prefix={<StopTwoTone />} placeholder="不修改请留空" />
            </Form.Item>
          )}
          <Form.Item name="realName" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
            <Input prefix={<UserOutlined />} placeholder="例如: 张三" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="角色" rules={[{ required: true }]} initialValue="agent">
                <Select>
                  {Object.entries(roleConfig).map(([k, v]) => (
                    <Option key={k} value={k}>
                      <Space>
                        <span style={{ color: v.color }}>{v.icon}</span>
                        {v.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                <Input prefix={<PhoneOutlined />} placeholder="11位手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="邮箱">
            <Input prefix={<MailOutlined />} placeholder="example@courier.com" />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="账号状态" initialValue="active">
              <Select>
                <Option value="active">✅ 启用</Option>
                <Option value="inactive">❌ 禁用</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
        {!editing && (
          <Alert
            type="info"
            showIcon
            message="新建坐席后会获得登录账号和初始密码，请妥善保存并通知坐席"
            style={{ marginTop: 12 }}
          />
        )}
      </Modal>
    </div>
  );
}
