import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpointDocs } from './swagger/api-contract';

@Controller()
@ApiTags('root')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiEndpointDocs({
    summary: 'Root greeting',
    description: 'Public root endpoint for basic service availability.',
    successStatus: 200,
    successDescription: 'Plain text greeting.',
    successExample: 'Hello World!',
    successContentType: 'text/plain',
    errors: [500],
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
