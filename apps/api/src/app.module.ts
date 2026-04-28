import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AreasModule } from './areas/areas.module';
import { AuthModule } from './auth/auth.module';
import { DeviceModule } from './device/device.module';
import { EnvironmentModule } from './environment/environment.module';
import { EquipModule } from './equip/equip.module';
import { LogModule } from './log/log.module';
import { ScenarioModule } from './scenario/scenario.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        charset: config.get<string>('DB_CHARSET') ?? 'utf8mb4',
        timezone: 'Z',
        autoLoadEntities: true,
        // 절대 true 금지 — 레거시 스키마 보호
        synchronize: false,
        extra: { connectionLimit: 10 },
      }),
    }),
    UserModule,
    AuthModule,
    EquipModule,
    EnvironmentModule,
    AreasModule,
    ScenarioModule,
    LogModule,
    DeviceModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
