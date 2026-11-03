import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SavedArtifactsModule } from './saved-artifacts/saved-artifacts.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    validate: (config: Record<string, unknown>) => {
      if (typeof config.JWT_SECRET !== 'string' || config.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters.');
      }
      if (typeof config.DATABASE_URL !== 'string' || !/^(postgresql|postgres):\/\//.test(config.DATABASE_URL)) {
        throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
      }
      return config;
    },
  }), PrismaModule, HealthModule, UploadModule, AuthModule, DatasetsModule, SavedArtifactsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
