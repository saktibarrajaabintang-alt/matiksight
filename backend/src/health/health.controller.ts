import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpointDocs } from '../swagger/api-contract';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiEndpointDocs({
    summary: 'Health check',
    description: 'Public liveness endpoint.',
    successStatus: 200,
    successDescription: 'Service liveness status.',
    successExample: { success: true, message: 'MatikSight Backend is running!', status: 'healthy', timestamp: '2026-11-03T00:00:00.000Z' },
    errors: [500],
  })
  check() {
    return this.healthService.check();
  }
}
