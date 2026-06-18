import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Badge, Space, Typography, Form, Input, Modal, message } from 'antd';
import {
  DashboardOutlined, ProfileOutlined, CustomerServiceOutlined,
  PhoneOutlined, TeamOutlined, SettingOutlined, UserOutlined,
  LogoutOutlined, BellOutlined, BarChartOutlined, LockOutlined,
} from '@ant-design/icons';
import { useAuth } from './store/auth';
import api from './utils/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Tickets from './pages/Tickets';
import Calls from './pages/Calls';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import SoftPhone from './components/SoftPhone';
import AppFooter from './components/AppFooter';
import KnowledgeFloatingBot from './components/KnowledgeFloatingBot';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (values: any) => {
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', values);
      message.success('密码修改成功，请重新登录');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
      logout();
      navigate('/kf/login');
    } catch (err: any) {
      message.error(err.response?.data?.error || '修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const menuItems = [
    { key: '/kf/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/kf/orders', icon: <ProfileOutlined />, label: '订单管理' },
    { key: '/kf/tickets', icon: <CustomerServiceOutlined />, label: '工单中心', badge: 3 },
    { key: '/kf/calls', icon: <PhoneOutlined />, label: '通话记录' },
    { key: '/kf/customers', icon: <TeamOutlined />, label: '客户档案' },
    { key: '/kf/users', icon: <UserOutlined />, label: '坐席管理', roles: ['admin', 'manager'] },
    { key: '/kf/reports', icon: <BarChartOutlined />, label: '统计报表' },
    { key: '/kf/settings', icon: <SettingOutlined />, label: '系统设置', roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter(i => !i.roles || (user && i.roles.includes(user.role)));

  useEffect(() => {
    if (user) {
      console.log('[App] User loaded:', user.realName, user.role);
    }
  }, [user]);

  return (
    <Layout className="app-layout">
      <Sider trigger={null} collapsible collapsed={collapsed} onCollapse={setCollapsed} width={180} collapsedWidth={64} style={{ background: '#0f172a' }}>
        <div 
          style={{
            height: 52,
            margin: '8px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1890ff, #096dd9)',
            borderRadius: 10,
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
            letterSpacing: 2,
            transition: 'all 0.3s ease'
          }}
        >
          {collapsed ? (
            <span style={{ fontSize: 22 }}>🤖</span>
          ) : (
            <Space size={8} style={{ padding: '0 8px' }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>智能客服</span>
            </Space>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => {
            navigate(key);
          }}
          items={visibleItems.map(i => ({
            key: i.key,
            icon: i.icon,
            label: (i as any).badge ? (
              <span style={{ display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}>
                <span>{i.label}</span>
                <Badge count={(i as any).badge} style={{ marginLeft: 6, pointerEvents: 'none' }} />
              </span>
            ) : i.label,
          }))}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Space size={12}>
            <Text strong style={{ fontSize: 16, color: '#262626' }}>🤖 智能客服系统</Text>
          </Space>
          <Space size="large">
            <Badge count={5}><BellOutlined style={{ fontSize: 18 }} /></Badge>
            <Dropdown menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: `${user?.realName}（${user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '主管' : '坐席'}）`, disabled: true },
                { type: 'divider' },
                { key: 'changePassword', icon: <LockOutlined />, label: '修改密码', onClick: () => setPasswordModalOpen(true) },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/kf/login'); } },
              ]
            }}>
              <Space>
                <Avatar src="/monkey-logo.svg" />
                <span>{user?.realName}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="app-content">
          <Routes>
            <Route path="/kf/dashboard" element={<Dashboard />} />
            <Route path="/kf/orders" element={<Orders />} />
            <Route path="/kf/tickets" element={<Tickets />} />
            <Route path="/kf/calls" element={<Calls />} />
            <Route path="/kf/customers" element={<Customers />} />
            <Route path="/kf/users" element={<Users />} />
            <Route path="/kf/reports" element={<Reports />} />
            <Route path="/kf/settings" element={<Settings />} />
            <Route path="/kf/*" element={<Navigate to="/kf/dashboard" />} />
          </Routes>
        </Content>
        <Footer style={{ padding: 0, background: '#fafafa' }}>
          <AppFooter />
        </Footer>
      </Layout>
      <SoftPhone />
      <KnowledgeFloatingBot />

      <Modal
        open={passwordModalOpen}
        title="🔐 修改密码"
        onCancel={() => { setPasswordModalOpen(false); passwordForm.resetFields(); }}
        onOk={() => passwordForm.submit()}
        okText="确认修改"
        cancelText="取消"
        width={460}
        confirmLoading={passwordLoading}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' },
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/kf/login" element={<Login />} />
      <Route path="/kf/*" element={token ? <MainLayout /> : <Navigate to="/kf/login" />} />
      <Route path="/" element={<Navigate to="/kf/dashboard" />} />
      <Route path="*" element={<Navigate to="/kf/dashboard" />} />
    </Routes>
  );
}
