import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { DevicesModule } from '../devices/devices.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [BillingModule, DevicesModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
