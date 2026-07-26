import { Controller, Get, Headers, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tenant KPI overview (today)' })
  overview(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    return this.analytics.overview(sessionToAuth(session, tenantHeader));
  }

  @Get('devices/:id')
  @ApiOperation({ summary: 'Per-device event series' })
  deviceSeries(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
  ) {
    return this.analytics.deviceSeries(
      sessionToAuth(session, tenantHeader),
      id,
    );
  }

  @Get('dwell')
  @ApiOperation({ summary: 'Dwell distribution summary' })
  dwell(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    return this.analytics.dwell(sessionToAuth(session, tenantHeader));
  }
}
