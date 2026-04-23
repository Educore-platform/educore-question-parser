import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // ── Swagger (non-production only) ────────────────────────────────────────
    const swaggerConfig = new DocumentBuilder()
      .setTitle('EduCore Question Parser API')
      .setDescription(
        'REST API for parsing, extracting, and enriching exam questions from PDF documents.',
      )
      .setVersion('1.0')
      .addServer(`http://localhost:${process.env.PORT ?? 3000}`, 'Local')
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


  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀  Application running on: http://localhost:${port}/api`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📖  Swagger docs:          http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
