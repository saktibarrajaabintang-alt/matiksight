import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatasetsModule } from '../datasets/datasets.module';
import { SavedReportsController, SavedVisualizationsController } from './saved-artifacts.controller';
import { SavedArtifactsService } from './saved-artifacts.service';

@Module({
  imports: [AuthModule, DatasetsModule],
  controllers: [SavedVisualizationsController, SavedReportsController],
  providers: [SavedArtifactsService],
})
export class SavedArtifactsModule {}
