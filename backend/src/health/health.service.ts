import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      success: true,
      message: 'MatikSight Backend is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
