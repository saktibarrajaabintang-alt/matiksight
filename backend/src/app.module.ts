import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [HealthModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
