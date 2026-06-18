import React, { useState } from 'react';
import { Form, Input, Button, message, Alert, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../store/auth';

const { Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (values: any) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', values);
      login(res.data.token, res.data.user);
      message.success(`欢迎回来，${res.data.user.realName}`);
      setTimeout(() => navigate('/dashboard'), 300);
    } catch (err: any) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/monkey-logo.svg" alt="喵喵" style={{ width: 88, height: 96 }} />
        </div>
        <div className="login-title">喵喵 · 快递网点智能客服系统</div>
        <div className="login-sub">Miaomiao Courier Intelligent Customer Service v2.0</div>
        <Alert
          style={{ marginBottom: 16, borderRadius: 8 }}
          type="info" showIcon
          message="默认账号：admin / agent1 ~ agent6 ，密码：123456"
        />
        <Form onFinish={handleLogin} layout="vertical" initialValues={{ username: 'admin', password: '123456' }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input size="large" prefix={<UserOutlined />} placeholder="账号" allowClear />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password size="large" prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit" loading={loading} block style={{ height: 44, fontWeight: 600 }}>登录系统</Button>
        </Form>
        <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <Space align="center" size={8}>
            <img src="/monkey-logo.svg" alt="喵喵" style={{ width: 22, height: 24 }} />
            <Text style={{ color: '#8c8c8c', fontSize: 12 }}>杭州喵喵至家网络有限公司</Text>
          </Space>
        </div>
      </div>
    </div>
  );
}
