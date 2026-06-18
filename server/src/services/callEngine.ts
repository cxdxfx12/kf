import { Server as SocketIOServer } from 'socket.io';

interface ActiveCall {
  callId: string;
  direction: 'inbound' | 'outbound';
  customerPhone: string;
  customerName: string;
  agentId: number;
  agentName: string;
  startedAt: Date;
  status: 'ringing' | 'connected' | 'ended';
  duration: number;
}

export class CallEngine {
  private io: SocketIOServer;
  private activeCalls: Map<string, ActiveCall> = new Map();
  private queues: { phone: string; name: string; waitingSince: Date }[] = [];

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  start() {
    this.io.on('connection', socket => {
      console.log(`客服座席连接: ${socket.id}`);

      socket.on('agent:login', data => {
        socket.join(`agent:${data.agentId}`);
        console.log(`座席登录: agentId=${data.agentId}`);
        this.io.emit('queue:update', this.queues);
      });

      // 外呼
      socket.on('call:dial', data => {
        const callId = `call-${Date.now()}`;
        const call: ActiveCall = {
          callId,
          direction: 'outbound',
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          agentId: data.agentId,
          agentName: data.agentName,
          startedAt: new Date(),
          status: 'ringing',
          duration: 0,
        };
        this.activeCalls.set(callId, call);
        this.io.to(`agent:${data.agentId}`).emit('call:started', call);
        setTimeout(() => {
          call.status = 'connected';
          this.io.to(`agent:${data.agentId}`).emit('call:connected', call);
        }, 2000);
      });

      // 模拟客户来电（入呼）
      socket.on('call:inbound', data => {
        this.queues.push({
          phone: data.phone,
          name: data.name,
          waitingSince: new Date(),
        });
        this.io.emit('queue:update', this.queues);
        this.io.emit('call:incoming', { phone: data.phone, name: data.name });
      });

      // 接听
      socket.on('call:answer', data => {
        const call = this.activeCalls.get(data.callId);
        if (call) {
          call.status = 'connected';
          this.io.to(`agent:${call.agentId}`).emit('call:answered', call);
        }
      });

      // 挂断
      socket.on('call:hangup', data => {
        const call = this.activeCalls.get(data.callId);
        if (call) {
          call.status = 'ended';
          call.duration = Math.floor((Date.now() - call.startedAt.getTime()) / 1000);
          this.io.to(`agent:${call.agentId}`).emit('call:ended', call);
          this.activeCalls.delete(data.callId);
        }
      });

      // 转接
      socket.on('call:transfer', data => {
        const call = this.activeCalls.get(data.callId);
        if (call) {
          call.agentId = data.toAgentId;
          call.agentName = data.toAgentName;
          this.io.to(`agent:${data.toAgentId}`).emit('call:transferred', call);
          this.io.to(`agent:${data.fromAgentId}`).emit('call:transferred:from', call);
        }
      });

      // 取工单号
      socket.on('call:ticket', data => {
        this.io.to(`agent:${data.agentId}`).emit('call:ticket', { callId: data.callId, ticketId: data.ticketId });
      });

      socket.on('queue:fetch', () => {
        socket.emit('queue:update', this.queues);
      });

      socket.on('queue:remove', data => {
        this.queues = this.queues.filter(q => q.phone !== data.phone);
        this.io.emit('queue:update', this.queues);
      });

      socket.on('disconnect', () => {
        console.log(`座席断开: ${socket.id}`);
      });
    });

    // 定时广播队列
    setInterval(() => {
      if (this.queues.length > 0) this.io.emit('queue:update', this.queues);
    }, 10000);
  }
}
