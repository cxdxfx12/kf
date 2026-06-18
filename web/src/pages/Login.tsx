import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../store/auth';

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
    <div className="login-wrapper">
      <div className="login-bg" />
      <div className="login-content">
        <div className="login-left">
          <div className="brand-section">
            <div className="brand-icon">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="50" fill="url(#gradient)" />
                <path d="M60 35c-8 0-14 6-14 14s6 14 14 14 14-6 14-14-6-14-14-14zm0 22c-4 0-8-3-8-8s4-8 8-8 8 3 8 8-4 8-8 8z" fill="white" />
                <path d="M42 70c0 8 6 15 13 15h10c7 0 13-7 13-15v-3H42v3z" fill="white" opacity="0.9" />
                <path d="M50 78h20v4H50z" fill="#FF6B6B" />
                <defs>
                  <radialGradient id="gradient" cx="0.3" cy="0.3">
                    <stop offset="0%" stopColor="#52C41A" />
                    <stop offset="100%" stopColor="#389E0D" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <h1 className="brand-title">喵喵快递智能客服</h1>
            <p className="brand-desc">Miaomiao Courier Intelligent Customer Service</p>
          </div>
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">📦</div>
              <span>快递订单管理</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎫</div>
              <span>工单智能处理</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📞</div>
              <span>呼叫中心集成</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <span>AI 智能助手</span>
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-card">
            <div className="card-header">
              <h2>欢迎登录</h2>
              <p>请输入您的账号信息</p>
            </div>
            <Form onFinish={handleLogin} layout="vertical" size="large">
              <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
                <Input prefix={<UserOutlined className="input-icon" />} placeholder="账号" allowClear />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password prefix={<LockOutlined className="input-icon" />} placeholder="密码" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block className="login-btn">
                登 录
              </Button>
            </Form>
            <div className="card-footer">
              <span>杭州喵喵至家网络有限公司</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .login-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #f5f7fa;
        }
        .login-bg {
          position: absolute;
          top: -20%;
          left: -20%;
          width: 140%;
          height: 140%;
          background: radial-gradient(circle at 30% 40%, rgba(82, 196, 26, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 70% 60%, rgba(56, 158, 13, 0.06) 0%, transparent 50%),
                      radial-gradient(circle at 50% 50%, rgba(82, 196, 26, 0.04) 0%, transparent 70%);
        }
        .login-content {
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          height: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 80px;
          background: linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(56, 158, 13, 0.03) 100%);
        }
        .brand-section {
          margin-bottom: 60px;
        }
        .brand-icon {
          width: 100px;
          height: 100px;
          margin-bottom: 28px;
        }
        .brand-title {
          font-size: 36px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
        }
        .brand-desc {
          font-size: 16px;
          color: #666;
          margin: 0;
          font-weight: 400;
        }
        .feature-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .feature-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }
        .feature-icon {
          font-size: 24px;
        }
        .feature-item span {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }
        .login-right {
          flex: 0 0 450px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px;
          background: white;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.06);
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
        }
        .card-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .card-header h2 {
          font-size: 28px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 8px 0;
        }
        .card-header p {
          font-size: 14px;
          color: #999;
          margin: 0;
        }
        .input-icon {
          color: #999;
          font-size: 16px;
        }
        .login-btn {
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          background: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
          transition: all 0.2s;
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #389E0D 0%, #237804 100%);
          box-shadow: 0 6px 16px rgba(56, 158, 13, 0.4);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .card-footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
        }
        .card-footer span {
          font-size: 12px;
          color: #bbb;
        }
        @media (max-width: 900px) {
          .login-left {
            display: none;
          }
          .login-right {
            flex: 1;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
