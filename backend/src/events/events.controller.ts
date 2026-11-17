import { Controller, Get } from '@nestjs/common';
import { EventsService } from './events.service.js';

@Controller('evenements')
export class EventsController {
  constructor(private readonly events: EventsService) {}
  @Get() list() { return this.events.listPublic(); }
}
