import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetProcessingService } from './dataset-processing.service';
import { DatasetsService } from './datasets.service';
import { AuthModule } from '../auth/auth.module';
import { DatasetAnalysisService } from './analysis/dataset-analysis.service';

@Module({
  imports: [AuthModule],
  controllers: [DatasetsController],
  providers: [DatasetProcessingService, DatasetsService, DatasetAnalysisService],
  exports: [DatasetAnalysisService],
})
export class DatasetsModule {}
