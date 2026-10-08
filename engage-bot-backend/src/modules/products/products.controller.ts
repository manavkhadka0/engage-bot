import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sessionToAuth } from '../../common/decorators/auth-ctx.decorator';
import { TENANT_ID_HEADER } from '../../common/guards/roles.guard';
import { ProductsService } from './products.service';

class CreateProductDto extends createZodDto(
  z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    imageKey: z.string().optional(),
  }),
) {}

class UpdateProductDto extends createZodDto(
  z.object({
    name: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    imageKey: z.string().optional(),
  }),
) {}

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products for active tenant' })
  list(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader?: string,
  ) {
    return this.products.list(sessionToAuth(session, tenantHeader));
  }

  @Post()
  @ApiOperation({ summary: 'Create product SKU' })
  create(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(sessionToAuth(session, tenantHeader), dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  update(
    @Session() session: UserSession,
    @Headers(TENANT_ID_HEADER) tenantHeader: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(sessionToAuth(session, tenantHeader), id, dto);
  }
}
