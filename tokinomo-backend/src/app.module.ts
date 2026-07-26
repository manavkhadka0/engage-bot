import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from 'nestjs-zod';
import { auth } from './auth/auth';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { MqttModule } from './common/mqtt/mqtt.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AudioModule } from './modules/audio/audio.module';
import { BillingModule } from './modules/billing/billing.module';
import { CommandsModule } from './modules/commands/commands.module';
import { DevicesModule } from './modules/devices/devices.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ProductsModule } from './modules/products/products.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { limit: '2mb', extended: true },
      },
    }),
    PrismaModule,
    StorageModule,
    MqttModule,
    HealthModule,
    AppConfigModule,
    BillingModule,
    TenantsModule,
    UsersModule,
    DevicesModule,
    ProductsModule,
    LocationsModule,
    AudioModule,
    CommandsModule,
    AnalyticsModule,
    RealtimeModule,
    WorkersModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
