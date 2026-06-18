import React from 'react';
import { Space, Typography } from 'antd';

const { Text } = Typography;

export default function AppFooter() {
  return (
    <div className="app-footer">
      <Space align="center" size={12}>
        <img src={`${import.meta.env.BASE_URL}monkey-logo.svg`} alt="喵喵" style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff' }} />
        <Space direction="vertical" size={0} align="center">
          <Text style={{ fontSize: 13, color: '#595959', fontWeight: 500 }}>杭州喵喵至家网络有限公司</Text>
          <Text style={{ fontSize: 11, color: '#8c8c8c' }}>喵喵 · 快递网点智能客服系统 © {new Date().getFullYear()}</Text>
        </Space>
      </Space>
    </div>
  );
}
