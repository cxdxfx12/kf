// 呼叫引擎 - 模拟 SaaS 呼叫中心能力（基于 Socket.IO 实时通信）
// 在生产环境中，这里应对接实际的呼叫中心服务商（如合力亿捷、华为云联络中心等）
const db = require('../db');

class CallEngine {
  constructor(io) {
    this.io = io;
    this.activeCalls = new Map();
    this.agentSockets = new Map(); // agentId -> socketId
    this.setup();
  }

  setup() {
    this.io.on('connection', (socket) => {
      const agentId = Number(socket.handshake.query.agentId);
      if (agentId) {
        this.agentSockets.set(agentId, socket.id);
        db.update('users', u => u.id === agentId, { status: 'online' });
        this.io.emit('agentStatus', { agentId, status: 'online' });
      }
      socket.on('disconnect', () => {
        if (agentId) {
          this.agentSockets.delete(agentId);
          db.update('users', u => u.id === agentId, { status: 'offline' });
          this.io.emit('agentStatus', { agentId, status: 'offline' });
        }
      });

      socket.on('call:start', async (data) => {
        await this.startCall(socket, data, agentId);
      });
      socket.on('call:answer', async (data) => {
        await this.answer(data.callId);
      });
      socket.on('call:end', async (data) => {
        await this.endCall(data.callId, data.summary);
      });
      socket.on('call:hold', (data) => {
        this.io.to(data.callId).emit('call:holdChanged', { callId: data.callId, hold: data.hold });
      });
      socket.on('call:transfer', async (data) => {
        await this.transfer(data.callId, data.targetAgentId);
      });
      socket.on('agent:status', (data) => {
        db.update('users', u => u.id === data.agentId, { status: data.status });
        this.io.emit('agentStatus', { agentId: data.agentId, status: data.status });
      });
    });
  }

  async startCall(socket, data, agentId) {
    const callId = `CALL${Date.now()}`;
    const call = {
      callId, agentId, customerPhone: data.customerPhone, customerName: data.customerName || '未知客户',
      customerId: data.customerId, direction: 'outbound', status: 'ringing', startTime: new Date(), duration: 0,
    };
    this.activeCalls.set(callId, call);
    socket.join(callId);

    const user = db.findOne('users', u => u.id === agentId);
    // 模拟呼叫振铃 2-3 秒，然后自动接通
    setTimeout(() => {
      if (this.activeCalls.get(callId)?.status === 'ringing') this.connect(callId);
    }, 2000 + Math.random() * 1000);

    db.insert('calls', {
      callId, direction: 'outbound', agentId, agentName: user?.name,
      customerId: data.customerId, customerName: data.customerName || '未知客户', customerPhone: data.customerPhone,
      status: 'ringing', startTime: new Date().toISOString(), duration: 0,
    });
    socket.emit('call:started', { callId, customerPhone: data.customerPhone, customerName: data.customerName });

    // 弹屏信息
    const customer = db.findOne('customers', c => c.phone === data.customerPhone);
    if (customer) {
      const recentOrders = db.findMany('orders', o => o.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      const recentTickets = db.findMany('tickets', t => t.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      socket.emit('call:screenpop', { isNew: false, customer, recentOrders, recentTickets });
    } else {
      socket.emit('call:screenpop', { isNew: true, customer: null, recentOrders: [], recentTickets: [] });
    }
  }

  // 模拟来电
  simulateInbound(customerPhone, customerName) {
    const callId = `CALL${Date.now()}`;
    const agents = Array.from(this.agentSockets.keys());
    if (agents.length === 0) return;
    const agentId = agents[Math.floor(Math.random() * agents.length)];
    const socketId = this.agentSockets.get(agentId);
    this.activeCalls.set(callId, { callId, agentId, customerPhone, customerName, direction: 'inbound', status: 'ringing', startTime: new Date(), duration: 0 });
    const user = db.findOne('users', u => u.id === agentId);

    db.insert('calls', {
      callId, direction: 'inbound', agentId, agentName: user?.name,
      customerId: null, customerName, customerPhone, status: 'ringing',
      startTime: new Date().toISOString(), duration: 0,
    });
    this.io.to(socketId).emit('call:incoming', { callId, customerPhone, customerName, direction: 'inbound' });
    const customer = db.findOne('customers', c => c.phone === customerPhone);
    if (customer) {
      const recentOrders = db.findMany('orders', o => o.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      const recentTickets = db.findMany('tickets', t => t.customerId === customer.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      this.io.to(socketId).emit('call:screenpop', { isNew: false, customer, recentOrders, recentTickets });
    }
  }

  connect(callId) {
    const call = this.activeCalls.get(callId);
    if (!call || call.status !== 'ringing') return;
    call.status = 'connected';
    call.timer = setInterval(() => {
      call.duration += 1;
      this.io.to(callId).emit('call:tick', { callId, duration: call.duration });
    }, 1000);
    this.io.to(callId).emit('call:connected', { callId });
    db.update('calls', c => c.callId === callId, { status: 'connected' });
  }

  answer(callId) { return this.connect(callId); }

  async endCall(callId, summary) {
    const call = this.activeCalls.get(callId);
    if (!call) return;
    if (call.timer) clearInterval(call.timer);
    call.status = 'ended';
    this.io.to(callId).emit('call:ended', { callId, duration: call.duration });
    db.update('calls', c => c.callId === callId, {
      status: 'ended', endTime: new Date().toISOString(),
      duration: call.duration,
      summary: summary || `通话结束，时长 ${call.duration} 秒`,
    });
    setTimeout(() => this.activeCalls.delete(callId), 1000);
  }

  async transfer(callId, targetAgentId) {
    const call = this.activeCalls.get(callId);
    if (!call) return;
    const targetSocketId = this.agentSockets.get(targetAgentId);
    if (!targetSocketId) return;
    call.agentId = targetAgentId;
    const user = db.findOne('users', u => u.id === targetAgentId);
    db.update('calls', c => c.callId === callId, { agentId: targetAgentId, agentName: user?.name });
    this.io.to(targetSocketId).emit('call:transferred', { callId, customerName: call.customerName });
  }
}

module.exports = { CallEngine };
