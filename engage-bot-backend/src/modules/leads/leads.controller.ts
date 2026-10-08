import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { LeadsService } from './leads.service';

class CreateLeadDto extends createZodDto(
  z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    brand: z.string().min(1).max(200),
    stores: z.string().max(50).optional(),
    intent: z.enum(['demo', 'pilot', 'platform', 'other']),
    message: z.string().min(1).max(4000),
  }),
) {}

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @AllowAnonymous()
  @HttpCode(200)
  @ApiOperation({ summary: 'Public marketing-site demo request form' })
  create(@Body() dto: CreateLeadDto) {
    return this.leads.notify(dto);
  }
}
