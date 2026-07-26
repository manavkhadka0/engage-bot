import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
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
  ) {
    return this.devices.list(sessionToAuth(session, tenantHeader), status);
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
