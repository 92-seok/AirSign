import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const prefix = config.get<string>('API_GLOBAL_PREFIX') ?? 'api';
  app.setGlobalPrefix(prefix, {
    // 정적 자산 라우트는 prefix에서 제외 — `/assets/...`로 직접 노출
    exclude: ['/assets/(.*)'],
  });

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * 레거시 LED 전광판 미리보기 자산 정적 서빙.
   *
   *   /assets/image/view/...   ← _legacy_php/image/view/
   *   /assets/MC/image/...     ← _legacy_php/MC/image/
   *   /assets/MC/video/...     ← _legacy_php/MC/video/
   *
   * `LEGACY_ASSET_ROOT` 환경변수로 경로 오버라이드 가능.
   * 운영 환경에서는 이 자산을 분리된 CDN/Apache로 옮길 수 있음.
   */
  const assetRoot = resolve(
    config.get<string>('LEGACY_ASSET_ROOT') ??
      join(process.cwd(), '..', '..', '_legacy_php'),
  );
  app.useStaticAssets(join(assetRoot, 'image'), {
    prefix: '/assets/image/',
    fallthrough: true,
  });
  app.useStaticAssets(join(assetRoot, 'MC'), {
    prefix: '/assets/MC/',
    fallthrough: true,
  });

  const port = Number(config.get<string>('API_PORT') ?? 3001);
  await app.listen(port);

  Logger.log(
    `AirSign API ready → http://localhost:${port}/${prefix}`,
    'Bootstrap',
  );
  Logger.log(
    `Legacy assets served from ${assetRoot} → /assets/image/, /assets/MC/`,
    'Bootstrap',
  );
}
void bootstrap();
