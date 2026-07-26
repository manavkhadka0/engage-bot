import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tokinomo API')
    .setDescription(
      'Multi-tenant SaaS API for the Tokinomo shelf-advertising robot fleet. ' +
        'OpenAPI is the contract Frontend builds against (see team/CONTRACTS.md ②).',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('health', 'Liveness / readiness')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

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
  console.log(`Scalar docs: http://localhost:${port}/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/api-json`);
}

void bootstrap();
