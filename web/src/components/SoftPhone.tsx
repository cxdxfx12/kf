import React, { useEffect, useState, useRef } from 'react';
import { Card, Input, Button, Space, Avatar, message, Tag, Typography } from 'antd';
import { PhoneOutlined, PhoneFilled, PhoneTwoTone, UserOutlined, RobotOutlined } from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import api from '../utils/api';

const { Title, Text } = Typography;

interface CallSession {
  id: string;
  customerPhone: string;
  customerName: string;
  agentId: number;
  agentName: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'connected' | 'ended';
  startTime: number;
}

export default function SoftPhone() {
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [session, setSession] = useState<CallSession | null>(null);
  const [timer, setTimer] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    socketRef.current = io('/');
    socketRef.current.on('call:incoming', (data: any) => {
      message.info(`来电：${data.phone}`);
    });
    return () => {
      socketRef.current?.disconnect();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startCall = async () => {
    if (!phone) return message.warning('请输入电话号码');
    try {
      await api.post('/calls/outbound/call', { customerPhone: phone });
      const id = `call-${Date.now()}`;
      setSession({
        id, customerPhone: phone, customerName: phone, agentId: 1, agentName: '当前坐席', direction: 'outbound', status: 'ringing', startTime: Date.now() });
      setTimer(0);
      message.success('正在拨号...');
      setTimeout(() => {
        setSession(s => s ? { ...s, status: 'connected' } : s);
        intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      }, 1800);
    } catch (err: any) { message.error(err.response?.data?.error || '拨号失败'); }
  };

  const endCall = async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (session) {
      try {
        await api.post('/calls', {
          customerPhone: session.customerPhone,
          customerName: session.customerName,
          direction: session.direction,
          duration: timer,
          status: 'connected',
          notes: note || '',
        });
      } catch {}
    }
    setSession(null);
    setPhone('');
    setNote('');
    message.success('通话已结束');
  };

  return (
    <div>
      <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 999 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button
            type="primary"
            size="large"
            shape="round"
            icon={<PhoneTwoTone twoToneColor="#52c41a" />}
            onClick={() => setVisible(!visible)}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          >📞 软电话 {session ? '(通话中)' : ''}
          </Button>
        </div>
        {visible && (
          <Card
            style={{
            width: 320, borderRadius: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #d9d9d9',
            padding: 0,
          }}
            styles={{ body: { padding: 16 } }}
            title={<Space><Avatar icon={<PhoneOutlined />} /><Text strong>电话拨号盘</Text></Space>}
          >
            {!session && (
              <>
                <Input size="large" placeholder="输入电话号码" value={phone} onChange={e => setPhone(e.target.value)} onPressEnter={startCall} />
                <Space style={{ marginTop: 12, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Button type="primary" icon={<PhoneOutlined />} onClick={startCall} size="large">开始拨号</Button>
                  <Button onClick={() => { setPhone(''); }}>清空</Button>
                </Space>
              </>
            )}
            {session && (
              <>
                <div style={{ textAlign: 'center', padding: 12, background: session.status === 'ringing' ? '#fff1f0' : '#f6ffed', borderRadius: 8 }}>
                  <div><Text type="secondary">{session.direction === 'outbound' ? '外呼' : '来电'}</Text></div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{session.customerPhone}</div>
                  <div style={{ color: session.status === 'connected' ? '#52c41a' : '#fa8c16' }}>{session.status === 'ringing' ? '振铃中...' : '已接通'}</div>
                  <div style={{ fontSize: 20, fontFamily: 'monospace' }}>{Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}</div>
                </div>
                <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                  <Input.TextArea rows={2} placeholder="通话备注（如：客户咨询订单状态...）" value={note} onChange={e => setNote(e.target.value)} />
                  <Button danger type="primary" block icon={<PhoneFilled />} onClick={endCall}>结束通话</Button>
                </Space>
              </>
            )}
            <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 6, fontSize: 11, color: '#666' }}>
              <RobotOutlined /> 支持：拨号盘、通话备注、呼叫中心 SDK 接入（容联 / 华为云）
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
