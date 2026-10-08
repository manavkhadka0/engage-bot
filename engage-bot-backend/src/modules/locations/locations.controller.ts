import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { LocationsService } from './locations.service';

class CreateLocationDto extends createZodDto(
  z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
) {}

class UpdateLocationDto extends createZodDto(
  z.object({
    name: z.string().min(1).optional(),
    address: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
) {}

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'List store locations for active tenant' })
  list(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    return this.locations.list(sessionToAuth(session, tenantHeader));
  }

  @Post()
  @ApiOperation({ summary: 'Create store location' })
  create(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Body() dto: CreateLocationDto,
  ) {
    return this.locations.create(sessionToAuth(session, tenantHeader), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update location' })
  update(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locations.update(
      sessionToAuth(session, tenantHeader),
      id,
      dto,
    );
  }
}
