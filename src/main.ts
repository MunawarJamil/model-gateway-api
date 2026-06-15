import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.setGlobalPrefix('v1', { exclude: ['health'] });

  app.use((req , res , next) => {
    if (req.path.startsWith('/api')) return next();

    return helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      originAgentCluster: false,
      hsts: false,
    })(req, res, next);
  });
  app.enableCors({
    origin: configService.get<string[]>('corsOrigins'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Model Gateway API')
    .setDescription(
      'AI Gateway supporting Gemini & Groq with auth, rate limiting, async jobs, and webhooks',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'API-Key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
  console.log(`Swagger docs at /api`);
}

void bootstrap();
