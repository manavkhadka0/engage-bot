import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { AudioService } from './audio.service';

class CreateAudioDto extends createZodDto(
  z.object({
    name: z.string().min(1),
    storageKey: z.string().optional(),
    checksum: z.string().optional(),
    durationMs: z.number().int().positive().optional(),
  }),
) {}

class PushAudioDto extends createZodDto(
  z.object({
    deviceIds: z.array(z.string()).min(1),
  }),
) {}

@ApiTags('audio')
@ApiBearerAuth()
@Controller('audio')
export class AudioController {
  constructor(private readonly audio: AudioService) {}

  @Get()
  @ApiOperation({ summary: 'List audio clips for tenant' })
  list(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    return this.audio.list(sessionToAuth(session, tenantHeader));
  }

  @Post()
  @ApiOperation({ summary: 'Register audio clip metadata' })
  create(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Body() dto: CreateAudioDto,
  ) {
    return this.audio.create(sessionToAuth(session, tenantHeader), dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload WAV clip to object storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 512 * 1024 },
    }),
  )
  upload(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name?: string,
  ) {
    return this.audio.upload(
      sessionToAuth(session, tenantHeader),
      file,
      name,
    );
  }

  @Post(':id/push')
  @ApiOperation({ summary: 'Queue audio_update commands to devices' })
  push(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() dto: PushAudioDto,
  ) {
    return this.audio.push(
      sessionToAuth(session, tenantHeader),
      id,
      dto.deviceIds,
    );
  }
}
