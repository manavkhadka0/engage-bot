import { DeviceStatus } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { RealtimeGateway } from '../../modules/realtime/realtime.gateway';
import type { CommandPublisher } from './command-publisher';
import { JobsProcessor } from './jobs.processor';

describe('JobsProcessor', () => {
  let prisma: any;
  let commands: { publishCommands: jest.Mock };
  let realtime: { emitDeviceStatus: jest.Mock };
  let proc: JobsProcessor;
  const env = { ...process.env };

  beforeEach(() => {
    prisma = {
      device: { findMany: jest.fn(), update: jest.fn() },
      deviceEvent: { create: jest.fn(), deleteMany: jest.fn() },
      audioClip: { findFirst: jest.fn() },
      command: { create: jest.fn() },
      deviceAudio: { createMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    commands = { publishCommands: jest.fn().mockResolvedValue([]) };
    realtime = { emitDeviceStatus: jest.fn() };
    proc = new JobsProcessor(
      {} as Queue,
      prisma as PrismaService,
      commands as unknown as CommandPublisher,
      realtime as unknown as RealtimeGateway,
    );
  });
  afterEach(() => {
    process.env = { ...env };
  });

  describe('offlineSweep', () => {
    it('is off by default', async () => {
      delete process.env.DEVICE_OFFLINE_AFTER_SECONDS;
      expect(await proc.offlineSweep()).toEqual({ skipped: true, marked: 0 });
      expect(prisma.device.findMany).not.toHaveBeenCalled();
    });

    it('marks stale ONLINE devices OFFLINE and notifies the tenant', async () => {
      process.env.DEVICE_OFFLINE_AFTER_SECONDS = '300';
      prisma.device.findMany.mockResolvedValue([{ id: 'd1', serial: 'S1', tenantId: 't1' }]);
      const now = new Date('2026-10-23T12:00:00Z');

      expect(await proc.offlineSweep(now)).toEqual({ skipped: false, marked: 1 });

      const where = prisma.device.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(DeviceStatus.ONLINE);
      expect(where.OR[0].lastSeen.lt).toEqual(new Date('2026-10-23T11:55:00Z'));
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(realtime.emitDeviceStatus).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ deviceId: 'd1', status: DeviceStatus.OFFLINE }),
      );
    });
  });

  describe('nightlyRollups', () => {
    it('deletes events older than the retention window', async () => {
      process.env.EVENT_RETENTION_DAYS = '30';
      prisma.deviceEvent.deleteMany.mockResolvedValue({ count: 7 });
      const out = await proc.nightlyRollups(new Date('2026-10-23T03:00:00Z'));
      expect(out).toEqual({ skipped: false, deleted: 7 });
      expect(prisma.deviceEvent.deleteMany.mock.calls[0][0].where.ts.lt).toEqual(
        new Date('2026-09-23T03:00:00Z'),
      );
    });

    it('keeps everything when retention is 0', async () => {
      process.env.EVENT_RETENTION_DAYS = '0';
      expect(await proc.nightlyRollups()).toEqual({ skipped: true, deleted: 0 });
      expect(prisma.deviceEvent.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('audioPushFanout', () => {
    it('publishes in batches and only to the tenant\'s own devices', async () => {
      prisma.audioClip.findFirst.mockResolvedValue({
        id: 'c1', storageKey: 'k', checksum: 'x', version: 1,
      });
      const ids = Array.from({ length: 60 }, (_, i) => `d${i}`);
      prisma.device.findMany.mockResolvedValue(ids.map((id) => ({ id })));
      let n = 0;
      prisma.command.create.mockImplementation(async () => ({ id: `cmd${n++}` }));

      const out = await proc.audioPushFanout({ tenantId: 't1', clipId: 'c1', deviceIds: ids });

      expect(prisma.device.findMany.mock.calls[0][0].where.tenantId).toBe('t1');
      expect(out).toEqual({ queued: 60, requested: 60 });
      expect(commands.publishCommands).toHaveBeenCalledTimes(3); // 25 + 25 + 10
    });

    it('fails (so BullMQ retries/records it) when the clip is not the tenant\'s', async () => {
      prisma.audioClip.findFirst.mockResolvedValue(null);
      await expect(
        proc.audioPushFanout({ tenantId: 't1', clipId: 'nope', deviceIds: ['d1'] }),
      ).rejects.toThrow(/not found/);
    });
  });
});
