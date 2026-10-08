import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { Server, Socket } from 'socket.io';
import { auth } from '../../auth/auth';
import { resolveTenantId } from '../../common/guards/roles.guard';

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

  // A socket carries no NestJS guard by default — verify the session cookie
  // ourselves so a client can't just join any tenant:{id} room it wants by
  // guessing/knowing the id (same principle as the MQTT tenant-trust fix on
  // the device side).
  private async resolveSocketAuth(client: Socket) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(client.handshake.headers),
    });
    if (!session) return null;

    const roleRaw = session.user.role;
    const role = Array.isArray(roleRaw) ? roleRaw[0] : (roleRaw ?? undefined);
    return {
      session,
      ...resolveTenantId({
        userRole: role,
        activeOrganizationId: session.session.activeOrganizationId,
        headerTenantId: null,
      }),
    };
  }

  @SubscribeMessage('subscribe.tenant')
  async subscribeTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tenantId: string },
  ) {
    if (!body?.tenantId) return { ok: false };

    const resolved = await this.resolveSocketAuth(client);
    if (!resolved) {
      this.logger.warn(`Unauthenticated realtime subscribe from ${client.id}`);
      return { ok: false, error: 'unauthenticated' };
    }

    const { tenantId, isPlatform } = resolved;
    if (!isPlatform && tenantId !== body.tenantId) {
      this.logger.warn(
        `Rejected realtime subscribe: session tenant ${tenantId ?? 'none'} != requested ${body.tenantId}`,
      );
      return { ok: false, error: 'forbidden' };
    }

    void client.join(`tenant:${body.tenantId}`);
    return { ok: true, room: `tenant:${body.tenantId}` };
  }

  /** Platform-only: joins a room that receives every tenant's device events, for fleet-wide views. */
  @SubscribeMessage('subscribe.platform')
  async subscribePlatform(@ConnectedSocket() client: Socket) {
    const resolved = await this.resolveSocketAuth(client);
    if (!resolved) {
      this.logger.warn(`Unauthenticated realtime subscribe from ${client.id}`);
      return { ok: false, error: 'unauthenticated' };
    }
    if (!resolved.isPlatform) {
      this.logger.warn(
        `Rejected platform realtime subscribe from non-platform user`,
      );
      return { ok: false, error: 'forbidden' };
    }

    void client.join('platform');
    return { ok: true, room: 'platform' };
  }

  emitDeviceStatus(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('device.status', payload);
    this.server.to('platform').emit('device.status', payload);
  }

  emitDeviceEvent(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('device.event', payload);
    this.server.to('platform').emit('device.event', payload);
  }
}
