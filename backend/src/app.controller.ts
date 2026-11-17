import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() { return { service: 'location-materiel-api', status: 'ok' }; }
}
