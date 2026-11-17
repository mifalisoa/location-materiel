import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { CommunicationsService } from './communications.service.js';
import { SendMessageDto } from './communication.dto.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Get('reservations/:id/messages')
  messages(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.communications.messages(req.user.id, req.user.role, id);
  }

  @Post('reservations/:id/messages')
  send(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.communications.send(req.user.id, req.user.role, id, dto.contenu);
  }

  @Get('notifications')
  notifications(@Req() req: AuthenticatedRequest) { return this.communications.notifications(req.user.id); }

  @Patch('notifications/:id/lue')
  markRead(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.communications.markRead(req.user.id, id);
  }

  @Patch('notifications/lues')
  markAllRead(@Req() req: AuthenticatedRequest) { return this.communications.markAllRead(req.user.id); }

  @Get('admin/messages')
  @UseGuards(AdminGuard)
  adminConversations() { return this.communications.adminConversations(); }
}
