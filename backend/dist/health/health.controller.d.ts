import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    check(): {
        success: boolean;
        message: string;
        status: string;
        timestamp: string;
    };
}
