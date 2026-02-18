import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Universal SaaS POS API')
      .setDescription('Phase 1 MVP - Production-ready POS Backend')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('users', 'User management')
      .addTag('items', 'Items and categories')
      .addTag('inventory', 'Inventory management')
      .addTag('purchases', 'Purchase orders')
      .addTag('billing', 'Billing operations')
      .addTag('kot', 'Kitchen order tickets')
      .addTag('printing', 'Print jobs')
      .addTag('reports', 'Reports and analytics')
      .addTag('audit', 'Audit logs')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received: closing HTTP server and database connections');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received: closing HTTP server and database connections');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
