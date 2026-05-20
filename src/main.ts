import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //  will remove fields that are not in the DTO
      forbidNonWhitelisted: true, // will throw an error if there are fields that are not in the DTO
      transform: true, // will transform the payload to the DTO class instance
    }),
  );

  
  await app.listen(3000);
  console.log('Server running on port 3000');
}

bootstrap();
