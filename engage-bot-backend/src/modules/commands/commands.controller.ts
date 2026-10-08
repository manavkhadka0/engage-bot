import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandType, Prisma } from '@prisma/client';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { CommandsService } from './commands.service';

class EnqueueCommandDto extends createZodDto(
  z.object({
    deviceId: z.string().min(1),
    type: z.nativeEnum(CommandType),
    payload: z.record(z.string(), z.unknown()).default({}),
  }),
) {}

@ApiTags('commands')
@ApiBearerAuth()
@Controller('commands')
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Get()
  @ApiOperation({ summary: 'List recent commands' })
  list(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.commands.list(sessionToAuth(session, tenantHeader), deviceId);
  }

  @Post()
  @ApiOperation({ summary: 'Enqueue a device command' })
  enqueue(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Body() dto: EnqueueCommandDto,
  ) {
    return this.commands.enqueue(sessionToAuth(session, tenantHeader), {
      deviceId: dto.deviceId,
      type: dto.type,
      payload: dto.payload as Prisma.InputJsonValue,
    });
  }
}
