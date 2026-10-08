import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { Request } from 'express';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { UsersService } from './users.service';

class InviteUserDto extends createZodDto(
  z.object({
    email: z.string().email(),
    role: z
      .enum(['BRAND_ADMIN', 'BRAND_STAFF', 'BRAND_VIEWER', 'admin', 'member'])
      .default('BRAND_STAFF'),
  }),
) {}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List members of active tenant/org' })
  list(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    return this.users.listMembers(sessionToAuth(session, tenantHeader));
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a user to the active tenant (email via Resend)' })
  invite(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Body() dto: InviteUserDto,
    @Req() req: Request,
  ) {
    return this.users.invite(sessionToAuth(session, tenantHeader), req, dto);
  }
}
