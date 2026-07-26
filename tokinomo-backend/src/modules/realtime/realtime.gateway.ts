import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  },
})
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`client disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe.tenant')
  subscribeTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tenantId: string },
  ) {
    if (!body?.tenantId) return { ok: false };
    void client.join(`tenant:${body.tenantId}`);
    return { ok: true, room: `tenant:${body.tenantId}` };
  }

  emitDeviceStatus(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('device.status', payload);
  }

  emitDeviceEvent(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('device.event', payload);
  }
}
