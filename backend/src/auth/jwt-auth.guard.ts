import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthUser { id: number; email: string; role: 'CLIENT' | 'ADMIN'; }
export type AuthenticatedRequest = Request & { user: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Authentification requise');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number; email: string; role: 'CLIENT' | 'ADMIN' }>(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch { throw new UnauthorizedException('Jeton invalide ou expiré'); }
  }
}
