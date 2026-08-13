import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceStatus } from '@prisma/client';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { DeviceSimulatorService } from './device-simulator.service';
import { DevicesService } from './devices.service';

class ProvisionDto extends createZodDto(
  z.object({ serial: z.string().min(3).max(64) }),
) {}

class AssignDto extends createZodDto(
  z.object({
    tenantId: z.string().min(1),
    locationId: z.string().optional(),
    productId: z.string().optional(),
  }),
) {}

class SetLocationDto extends createZodDto(
  z.object({ locationId: z.string().nullable() }),
) {}

class SendCommandDto extends createZodDto(
  z
    .object({
      type: z.enum(['play', 'reboot', 'config']),
      clipId: z.string().optional(),
      dwellMs: z.number().int().positive().optional(),
      cooldownMs: z.number().int().positive().optional(),
      volume: z.number().int().min(0).max(100).optional(),
      ledColor: z.string().optional(),
    })
    .refine((d) => d.type !== 'play' || !!d.clipId, {
      message: 'clipId is required for type=play',
      path: ['clipId'],
    }),
) {}

class SimulateDto extends createZodDto(
  z.object({
    action: z.enum([
      'online',
      'offline',
      'telemetry',
      'detection',
      'dwell',
      'play',
      'loop',
    ]),
    dwellMs: z.number().int().positive().optional(),
    clipId: z.string().optional(),
  }),
) {}

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devices: DevicesService,
    private readonly simulator: DeviceSimulatorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List devices (tenant-scoped; platform sees all or x-tenant-id)',
  })
  list(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
    @Query('status') status?: DeviceStatus,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
    return this.devices.list(sessionToAuth(session, tenantHeader), status, {
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Device detail + recent commands' })
  get(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
  ) {
    return this.devices.get(sessionToAuth(session, tenantHeader), id);
  }

  @Post('provision')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({ summary: 'Register serial → provisioning token (platform)' })
  provision(@Body() dto: ProvisionDto) {
    return this.devices.provision(dto.serial);
  }

  @Post(':id/assign')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({
    summary: 'Assign device to tenant + optional location/product',
  })
  assign(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() dto: AssignDto,
  ) {
    return this.devices.assign(sessionToAuth(session, tenantHeader), id, dto);
  }

  @Patch(':id/location')
  @ApiOperation({
    summary:
      'Set (or clear) a device\'s location within its own tenant — for the fleet map',
  })
  setLocation(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() dto: SetLocationDto,
  ) {
    return this.devices.setLocation(
      sessionToAuth(session, tenantHeader),
      id,
      dto.locationId,
    );
  }

  @Post(':id/command')
  @ApiOperation({
    summary: 'Send a play/config/reboot command to a device (cmd channel)',
  })
  sendCommand(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() dto: SendCommandDto,
  ) {
    return this.devices.sendCommand(
      sessionToAuth(session, tenantHeader),
      id,
      dto,
    );
  }

  @Post(':id/simulate')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({
    summary:
      'Fake device events (no hardware) — online/dwell/play/loop for end-to-end tests',
  })
  simulate(@Param('id') id: string, @Body() dto: SimulateDto) {
    return this.simulator.simulate(id, dto.action, {
      dwellMs: dto.dwellMs,
      clipId: dto.clipId,
    });
  }
}
