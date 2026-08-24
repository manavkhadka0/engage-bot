import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandStatus, CommandType } from '@prisma/client';
import { CommandsService } from './commands.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CommandPublisher } from '../../workers/jobs/command-publisher';
import type { AuthContext } from '../../common/guards/roles.guard';

/**
 * No @nestjs/testing module here — CommandsService takes two constructor
 * deps and has no decorators to resolve, so `new CommandsService(...)` with
 * hand-rolled mocks is simpler and just as valid as spinning up a Nest
 * TestingModule (that's worth it once a guard/interceptor/DI graph is
 * actually part of what you're testing — see roles.guard.spec.ts and
 * mqtt-auth.service.spec.ts for both styles).
 */
describe('CommandsService', () => {
  let prisma: {
    command: { findMany: jest.Mock; create: jest.Mock };
    device: { findUnique: jest.Mock };
  };
  let commandPublisher: { publishCommands: jest.Mock };
  let service: CommandsService;

  const platformAuth: AuthContext = {
    user: {
      id: 'p1',
      email: 'p@b.com',
      name: 'P',
      role: 'PLATFORM_OWNER',
      emailVerified: true,
    },
    session: { id: 's1' },
    tenantId: null,
    isPlatform: true,
  };

  const brandAuth = (tenantId: string | null): AuthContext => ({
    user: {
      id: 'b1',
      email: 'b@b.com',
      name: 'B',
      role: 'BRAND_ADMIN',
      emailVerified: true,
    },
    session: { id: 's1' },
    tenantId,
    isPlatform: false,
  });

  beforeEach(() => {
    prisma = {
      command: { findMany: jest.fn(), create: jest.fn() },
      device: { findUnique: jest.fn() },
    };
    commandPublisher = { publishCommands: jest.fn().mockResolvedValue([]) };
    service = new CommandsService(
      prisma as unknown as PrismaService,
      commandPublisher as unknown as CommandPublisher,
    );
  });

  describe('enqueue', () => {
    it('throws NotFoundException for a device that does not exist', async () => {
      prisma.device.findUnique.mockResolvedValue(null);
      await expect(
        service.enqueue(brandAuth('tenant-a'), {
          deviceId: 'missing',
          type: CommandType.REBOOT,
          payload: {},
        }),
      ).rejects.toThrow(NotFoundException);
      expect(commandPublisher.publishCommands).not.toHaveBeenCalled();
    });

    it("denies a brand user targeting another tenant's device", async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-B',
      });
      await expect(
        service.enqueue(brandAuth('tenant-a'), {
          deviceId: 'dev-1',
          type: CommandType.REBOOT,
          payload: {},
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.command.create).not.toHaveBeenCalled();
    });

    it("lets a platform user (impersonation) enqueue a command for a tenant's device", async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      prisma.command.create.mockResolvedValue({
        id: 'cmd-1',
        status: CommandStatus.QUEUED,
      });

      const result = await service.enqueue(platformAuth, {
        deviceId: 'dev-1',
        type: CommandType.PLAY,
        payload: { clipId: 'clip-1' },
      });

      expect(prisma.command.create).toHaveBeenCalledWith({
        data: {
          deviceId: 'dev-1',
          type: CommandType.PLAY,
          payload: { clipId: 'clip-1' },
          status: CommandStatus.QUEUED,
        },
      });
      expect(commandPublisher.publishCommands).toHaveBeenCalledWith(['cmd-1'], {
        simulateAck: true,
      });
      expect(result.command).toEqual({
        id: 'cmd-1',
        status: CommandStatus.QUEUED,
      });
    });

    it('creates and publishes for a brand user targeting their own device', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      prisma.command.create.mockResolvedValue({
        id: 'cmd-2',
        status: CommandStatus.QUEUED,
      });

      await service.enqueue(brandAuth('tenant-a'), {
        deviceId: 'dev-1',
        type: CommandType.CONFIG,
        payload: { volume: 5 },
      });

      expect(commandPublisher.publishCommands).toHaveBeenCalledWith(['cmd-2'], {
        simulateAck: true,
      });
    });
  });

  describe('list', () => {
    it('throws ForbiddenException for a brand user with no active tenant', () => {
      // list() throws synchronously on this path (it's not an `async`
      // method — it returns prisma's promise directly on the happy path),
      // so this needs a throwing-function wrapper, not `.rejects`.
      expect(() => service.list(brandAuth(null))).toThrow(ForbiddenException);
      expect(prisma.command.findMany).not.toHaveBeenCalled();
    });

    it("scopes a brand user's query to their own tenant", async () => {
      prisma.command.findMany.mockResolvedValue([]);
      await service.list(brandAuth('tenant-a'));
      expect(prisma.command.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { device: { tenantId: 'tenant-a' } },
        }),
      );
    });

    it('lets a platform user with no tenant selected see commands across all tenants', async () => {
      prisma.command.findMany.mockResolvedValue([]);
      await service.list(platformAuth);
      expect(prisma.command.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('scopes a platform user to the impersonated tenant when one is selected', async () => {
      prisma.command.findMany.mockResolvedValue([]);
      await service.list({ ...platformAuth, tenantId: 'tenant-b' });
      expect(prisma.command.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { device: { tenantId: 'tenant-b' } },
        }),
      );
    });

    it('adds an optional deviceId filter on top of tenant scoping', async () => {
      prisma.command.findMany.mockResolvedValue([]);
      await service.list(brandAuth('tenant-a'), 'dev-1');
      expect(prisma.command.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deviceId: 'dev-1', device: { tenantId: 'tenant-a' } },
        }),
      );
    });
  });
});
