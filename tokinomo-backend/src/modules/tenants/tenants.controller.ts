import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { CreateTenantDto, UpdateTenantDto } from './tenants.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants (platform)' })
  list() {
    return this.tenants.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by id (platform)' })
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
  @ApiOperation({ summary: 'Update tenant name/tier/status (platform)' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }
}
