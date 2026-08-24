import { Test } from '@nestjs/testing';
import { MqttAuthService } from './mqtt-auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Backs EMQX's authn/authz HTTP hooks — if this is wrong, a device can
 * impersonate another device's serial, or read/command a channel outside
 * its own tenant. Every case here maps to a line in the ACL contract
 * (CONTRACTS.md §①/④), not just a code-coverage box to tick.
 */
describe('MqttAuthService', () => {
  let service: MqttAuthService;
  let prisma: { device: { findUnique: jest.Mock } };
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    prisma = { device: { findUnique: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MqttAuthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(MqttAuthService);

    process.env = {
      ...ORIGINAL_ENV,
      MQTT_USERNAME: 'tokinomo-backend',
      MQTT_PASSWORD: 'super-secret',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetAllMocks();
  });

  describe('authenticate', () => {
    it('denies when username or password is missing', async () => {
      expect(await service.authenticate(undefined, 'x')).toEqual({
        allow: false,
      });
      expect(await service.authenticate('x', undefined)).toEqual({
        allow: false,
      });
      expect(prisma.device.findUnique).not.toHaveBeenCalled();
    });

    it('grants the backend its own credentials as superuser, without a device lookup', async () => {
      const result = await service.authenticate(
        'tokinomo-backend',
        'super-secret',
      );
      expect(result).toEqual({ allow: true, superuser: true });
      expect(prisma.device.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a client that merely guesses the backend username with the wrong password', async () => {
      prisma.device.findUnique.mockResolvedValue(null);
      const result = await service.authenticate('tokinomo-backend', 'wrong');
      expect(result).toEqual({ allow: false });
    });

    it('authenticates a device by serial + provisionToken', async () => {
      prisma.device.findUnique.mockResolvedValue({
        serial: 'TKN-0001',
        provisionToken: 'device-token',
        tenantId: 'tenant-a',
      });
      const result = await service.authenticate('TKN-0001', 'device-token');
      expect(result).toEqual({ allow: true, superuser: false });
      expect(prisma.device.findUnique).toHaveBeenCalledWith({
        where: { serial: 'TKN-0001' },
      });
    });

    it('rejects an unknown serial', async () => {
      prisma.device.findUnique.mockResolvedValue(null);
      expect(await service.authenticate('ghost-serial', 'anything')).toEqual({
        allow: false,
      });
    });

    it('rejects a known serial with the wrong token', async () => {
      prisma.device.findUnique.mockResolvedValue({
        serial: 'TKN-0001',
        provisionToken: 'device-token',
        tenantId: 'tenant-a',
      });
      expect(await service.authenticate('TKN-0001', 'wrong-token')).toEqual({
        allow: false,
      });
    });

    it('rejects a device that has never been provisioned (null token)', async () => {
      prisma.device.findUnique.mockResolvedValue({
        serial: 'TKN-0002',
        provisionToken: null,
        tenantId: 'tenant-a',
      });
      expect(await service.authenticate('TKN-0002', '')).toEqual({
        allow: false,
      });
    });
  });

  describe('authorize', () => {
    it('denies when username, topic, or action is missing', async () => {
      expect(
        await service.authorize(undefined, 't/a/d/b/status', 'publish'),
      ).toBe(false);
      expect(await service.authorize('TKN-0001', undefined, 'publish')).toBe(
        false,
      );
      expect(
        await service.authorize('TKN-0001', 't/a/d/b/status', undefined),
      ).toBe(false);
    });

    it('grants the backend client full access without a device lookup', async () => {
      const result = await service.authorize(
        'tokinomo-backend',
        't/any/d/any/cmd',
        'publish',
      );
      expect(result).toBe(true);
      expect(prisma.device.findUnique).not.toHaveBeenCalled();
    });

    it('denies a device with no tenant assigned', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: null,
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-a/d/dev-1/status',
        'publish',
      );
      expect(result).toBe(false);
    });

    it('denies malformed topics regardless of shape', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const malformed = [
        't/tenant-a/d/dev-1', // missing channel
        'x/tenant-a/d/dev-1/status', // wrong prefix
        't/tenant-a/x/dev-1/status', // wrong 3rd segment
        't/tenant-a/d/dev-1/status/extra', // too many segments
      ];
      for (const topic of malformed) {
        expect(await service.authorize('TKN-0001', topic, 'publish')).toBe(
          false,
        );
      }
    });

    it("denies a device publishing on another device's topic (cross-device isolation)", async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-a/d/dev-OTHER/status',
        'publish',
      );
      expect(result).toBe(false);
    });

    it("denies a device publishing under another tenant's id, even for its own device id (cross-tenant isolation)", async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-B/d/dev-1/status',
        'publish',
      );
      expect(result).toBe(false);
    });

    it.each(['status', 'telemetry', 'event', 'ack'])(
      'allows a device to publish on its own %s channel',
      async (channel) => {
        prisma.device.findUnique.mockResolvedValue({
          id: 'dev-1',
          tenantId: 'tenant-a',
        });
        const result = await service.authorize(
          'TKN-0001',
          `t/tenant-a/d/dev-1/${channel}`,
          'publish',
        );
        expect(result).toBe(true);
      },
    );

    it('denies a device publishing to cmd (device-to-cloud only, cmd is cloud-to-device)', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-a/d/dev-1/cmd',
        'publish',
      );
      expect(result).toBe(false);
    });

    it('allows a device to subscribe to its own cmd channel', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-a/d/dev-1/cmd',
        'subscribe',
      );
      expect(result).toBe(true);
    });

    it('denies a device subscribing to a channel it should only publish on', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-a/d/dev-1/status',
        'subscribe',
      );
      expect(result).toBe(false);
    });

    it('denies an unrecognized action even on an otherwise-valid topic', async () => {
      prisma.device.findUnique.mockResolvedValue({
        id: 'dev-1',
        tenantId: 'tenant-a',
      });
      const result = await service.authorize(
        'TKN-0001',
        't/tenant-a/d/dev-1/status',
        'delete',
      );
      expect(result).toBe(false);
    });
  });
});
