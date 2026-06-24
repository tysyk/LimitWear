import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createCorsOptions } from './app.cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);

  app.enableCors(createCorsOptions(configService));
  app.enableShutdownHooks();
  setupSwagger(app);

  await app.listen(port);
}

function setupSwagger(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const config = new DocumentBuilder()
    .setTitle('LimitWear API')
    .setDescription('API documentation for the LimitWear marketplace backend.')
    .setVersion('0.1.0')
    .addCookieAuth('limitwear_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'limitwear_session',
      description: 'HttpOnly session cookie returned by POST /auth/login.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

void bootstrap();
