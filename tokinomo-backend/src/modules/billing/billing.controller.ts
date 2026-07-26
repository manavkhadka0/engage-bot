import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionStatus, TenantTier } from '@prisma/client';
import { Roles, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { BillingService } from './billing.service';

class ChangeTierDto extends createZodDto(
  z.object({
    tier: z.enum(['BASIC', 'GROWTH', 'BRAND']),
    activateNow: z.boolean().optional(),
  }),
) {}

class SetStatusDto extends createZodDto(
  z.object({
    status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED']),
  }),
) {}

class ConvertDto extends createZodDto(
  z.object({
    tier: z.enum(['BASIC', 'GROWTH', 'BRAND']).optional(),
  }),
) {}

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Public tier catalogue (prices + features)' })
  catalog() {
    return this.billing.catalog();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Subscription overview for active tenant' })
  overview(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    const auth = sessionToAuth(session, tenantHeader);
    if (!auth.tenantId) {
      return { error: 'Active tenant required' };
    }
    return this.billing.getForTenant(auth.tenantId);
  }

  @Get('tenants')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({ summary: 'All tenant subscriptions (platform)' })
  listAll() {
    return this.billing.listAll();
  }

  @Get('tenants/:tenantId')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({ summary: 'Subscription detail for a tenant (platform)' })
  getTenant(@Param('tenantId') tenantId: string) {
    return this.billing.getForTenant(tenantId);
  }

  @Patch('tenants/:tenantId/tier')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({ summary: 'Change tenant tier' })
  changeTier(@Param('tenantId') tenantId: string, @Body() dto: ChangeTierDto) {
    return this.billing.changeTier(tenantId, dto.tier as TenantTier, {
      activateNow: dto.activateNow,
    });
  }

  @Patch('tenants/:tenantId/status')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({ summary: 'Set subscription status' })
  setStatus(@Param('tenantId') tenantId: string, @Body() dto: SetStatusDto) {
    return this.billing.setStatus(
      tenantId,
      dto.status as SubscriptionStatus,
    );
  }

  @Post('tenants/:tenantId/convert')
  @Roles(['PLATFORM_OWNER', 'PLATFORM_OPERATOR'])
  @ApiOperation({ summary: 'Convert trial → paid (month-6 review)' })
  convert(@Param('tenantId') tenantId: string, @Body() dto: ConvertDto) {
    return this.billing.convertFromTrial(
      tenantId,
      dto.tier as TenantTier | undefined,
    );
  }
}
