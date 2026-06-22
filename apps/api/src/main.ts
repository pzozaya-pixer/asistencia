import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';

  if (configService.get<string>('TRUST_PROXY') === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((request: any, response: any, next: () => void) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    if (request.secure || request.headers['x-forwarded-proto'] === 'https') {
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  });

  app.enableCors({
    origin: buildCorsOriginChecker(
      configService.get<string>('CORS_ALLOWED_ORIGINS') ?? '',
    ),
  });
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  validateSecurityConfig(configService);
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000, '0.0.0.0');
}

void bootstrap();

function buildCorsOriginChecker(allowedOriginsValue: string) {
  const allowedOrigins = allowedOriginsValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, allowedOrigins.includes(origin));
  };
}

function validateSecurityConfig(configService: ConfigService) {
  const isProduction = (configService.get<string>('NODE_ENV') ?? 'development') === 'production';

  if (!isProduction) {
    return;
  }

  const requiredSecrets = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'QR_SIGNING_SECRET',
    'AUTOMATION_SECRET',
    'N8N_ENCRYPTION_KEY',
    'N8N_USER_MANAGEMENT_JWT_SECRET',
  ];

  for (const secretName of requiredSecrets) {
    const value = configService.get<string>(secretName) ?? '';

    if (
      !value ||
      value.includes('replace-with-strong-secret') ||
      value.includes('change-me') ||
      value.length < 24
    ) {
      throw new Error(
        `Unsafe production secret detected for ${secretName}.`,
      );
    }
  }
}
