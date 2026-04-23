import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const swaggerServerUrl = railwayDomain
    ? `https://${railwayDomain.replace(/\/+$/, '')}`
    : `http://localhost:${port}`;

  // ── Global prefix & versioning ───────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Global response interceptor ──────────────────────────────────────────
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors();

  // ── Swagger ──────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduCore Question Parser API')
    .setDescription(
      'REST API for parsing, extracting, and enriching exam questions from PDF documents.',
    )
    .setVersion('1.0')
    .addServer(swaggerServerUrl, railwayDomain ? 'Production' : 'Local')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('subjects', 'Subject management')
    .addTag('exam-types', 'Exam type management')
    .addTag('papers', 'Exam paper management')
    .addTag('questions', 'Exam question retrieval and management')
    .addTag(
      'ai-processed-questions',
      'AI-enriched question review and correction',
    )
    .addTag('documents', 'Document file management')
    .addTag('invalid-exam-questions', 'Invalid / rejected question records')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);

  console.log(`\n🚀  Application running on: http://localhost:${port}/api`);
  console.log(`📖  Swagger docs:          ${swaggerServerUrl}/api/docs`);
}

void bootstrap();
