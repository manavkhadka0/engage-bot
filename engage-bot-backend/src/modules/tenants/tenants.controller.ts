import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import {
  ArchiveTenantDto,
  CreateTenantDto,
  RenameSlugDto,
  SimulateFleetDto,
  TransferAdminDto,
  UpdateTenantDto,
  WipeTelemetryDto,
} from './tenants.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants (platform)' })
  list(@Query('includeArchived') includeArchived?: string) {
    return this.tenants.list(
      includeArchived === '1' || includeArchived === 'true',
    );
  }

  @Get('ops-overview')
  @ApiOperation({
    summary:
      'Ops desk aggregates + capped attention queue (platform; no full collections)',
  })
  opsOverview() {
    return this.tenants.opsOverview();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant detail bundle (platform)' })
  get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create tenant + brand admin (email/password emailed)',
  })
  create(@Body() dto: CreateTenantDto, @Req() req: Request) {
    return this.tenants.create(dto, req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tenant fields (platform)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @Req() req: Request,
  ) {
    return this.tenants.update(id, dto, req.auth?.user);
  }

  @Patch(':id/slug')
  @ApiOperation({ summary: 'Rename tenant slug (breaks deep links)' })
  renameSlug(
    @Param('id') id: string,
    @Body() dto: RenameSlugDto,
    @Req() req: Request,
  ) {
    return this.tenants.renameSlug(id, dto, req.auth?.user);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Soft-archive tenant' })
  archive(
    @Param('id') id: string,
    @Body() dto: ArchiveTenantDto,
    @Req() req: Request,
  ) {
    return this.tenants.archive(id, dto, req.auth?.user);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Restore archived tenant' })
  unarchive(
    @Param('id') id: string,
    @Body() dto: ArchiveTenantDto,
    @Req() req: Request,
  ) {
    return this.tenants.unarchive(id, dto, req.auth?.user);
  }

  @Post(':id/wipe-telemetry')
  @ApiOperation({ summary: 'Delete device events for tenant (danger)' })
  wipeTelemetry(
    @Param('id') id: string,
    @Body() dto: WipeTelemetryDto,
    @Req() req: Request,
  ) {
    return this.tenants.wipeTelemetry(id, dto, req.auth?.user);
  }

  @Post(':id/simulate-fleet')
  @ApiOperation({ summary: 'Simulate all assigned devices' })
  simulateFleet(@Param('id') id: string, @Body() dto: SimulateFleetDto) {
    return this.tenants.simulateFleet(id, dto);
  }

  @Post(':id/transfer-admin')
  @ApiOperation({ summary: 'Invite or promote brand admin' })
  transferAdmin(
    @Param('id') id: string,
    @Body() dto: TransferAdminDto,
    @Req() req: Request,
  ) {
    return this.tenants.transferAdmin(id, dto, req);
  }
}
