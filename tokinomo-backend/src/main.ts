import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

function resolveCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const corsOrigins = resolveCorsOrigins();

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cookie',
        'x-tenant-id',
        'Accept',
      ],
    },
  });

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'x-tenant-id',
      'Accept',
    ],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tokinomo API')
    .setDescription(
      'Multi-tenant SaaS API for Tokinomo. Auth via Better Auth (`/api/auth/*`). ' +
        'Platform roles: PLATFORM_OWNER, PLATFORM_OPERATOR. ' +
        'Brand roles: BRAND_ADMIN, BRAND_STAFF, BRAND_VIEWER. ' +
        'Pass `x-tenant-id` for platform impersonation.',
    )
    .setVersion('0.2.0')
    .addCookieAuth('better-auth.session_token')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'x-tenant-id', in: 'header' },
      'tenant',
    )
    .addTag('billing')
    .addTag('health')
    .addTag('config')
    .addTag('tenants')
    .addTag('users')
    .addTag('devices')
    .addTag('products')
    .addTag('locations')
    .addTag('audio')
    .addTag('commands')
    .addTag('analytics')
    .build();

  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  app.getHttpAdapter().get('/api-json', (_req: Request, res: Response) => {
    res.type('application/json').send(document);
  });

  app.use(
    '/docs',
    apiReference({
      theme: 'default',
      content: document,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Tokinomo API listening on http://localhost:${port}`);
  console.log(`CORS origins: ${resolveCorsOrigins().join(', ')}`);
  console.log(`Auth: http://localhost:${port}/api/auth`);
  console.log(`Scalar docs: http://localhost:${port}/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/api-json`);
}

void bootstrap();
