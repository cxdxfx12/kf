import { useMemo, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Badge } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined, MailOutlined, PhoneOutlined, TeamOutlined,
  BarChartOutlined, SettingOutlined, UserOutlined, LogoutOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAppStore(s => s.user);
  const logout = useAppStore(s => s.logout);
  const nav = useNavigate();
  const location = useLocation();

  const menuItems = useMemo(() => {
    const items: any[] = [
      { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
      { key: '/orders', icon: <ShoppingOutlined />, label: '订单管理' },
      { key: '/tickets', icon: <MailOutlined />, label: <span>工单中心 <Badge count="New" style={{ backgroundColor: '#ff4d4f', marginLeft: 6 }} /></span> },
      { key: '/calls', icon: <PhoneOutlined />, label: '通话记录' },
      { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
    ];
    if (user?.role === 'admin' || user?.role === 'manager') {
      items.push({ key: '/reports', icon: <BarChartOutlined />, label: '数据报表' });
    }
    if (user?.role === 'admin') {
      items.push({ key: '/settings', icon: <SettingOutlined />, label: '系统设置' });
    }
    return items;
  }, [user]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed} 
          width={180}
          style={{ background: '#0f172a' }}
        >
        <div 
          style={{
            height: 56,
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
          <span style={{ fontSize: 22, marginRight: 8 }}>🤖</span>
          {!collapsed && <span>智能客服</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => nav(key as string)}
          style={{ borderRight: 0, marginTop: 4 }}
        />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#001529' }}>
            {menuItems.find(m => m.key === location.pathname)?.label?.props?.children?.[0] ||
             menuItems.find(m => m.key === location.pathname)?.label || '快递网点客服系统'}
          </div>
          <Dropdown menu={{
            items: [
              { key: 'user', label: <div><b>{user?.realName}</b><div style={{ fontSize: 12, color: '#8c8c8c' }}>{user?.username} · {roleLabel(user?.role)}</div></div>, disabled: true },
              { type: 'divider' },
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); nav('/login'); } },
            ],
          }} placement="bottomRight">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '0 8px', borderRadius: 6 }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span style={{ color: '#001529' }}>{user?.realName}</span>
              <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 4 }}>({roleLabel(user?.role)})</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 0, minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

function roleLabel(role?: string) {
  return { admin: '管理员', manager: '主管', agent: '客服' }[role || ''] || '用户';
}
