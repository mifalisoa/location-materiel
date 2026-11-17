import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, compare } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Client, User } from '../database/entities.js';
import { RegisterDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterDto) {
    if (await this.users.exists({ where: { email: input.email.toLowerCase() } })) throw new ConflictException('Cette adresse e-mail est déjà utilisée');
    const passwordHash = await hash(input.motDePasse, 12);
    const user = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(User, manager.create(User, { email: input.email.toLowerCase(), motDePasseHash: passwordHash, role: 'CLIENT', actif: true }));
      await manager.save(Client, manager.create(Client, {
        utilisateurId: created.id, nom: input.nom, prenom: input.prenom, telephone: input.telephone,
        email: created.email, societe: input.societe ?? null, adresse: input.adresse ?? null,
      }));
      return created;
    });
    return this.issueToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.motDePasseHash').where('user.email = :email', { email: email.toLowerCase() }).getOne();
    if (!user || !user.actif || !(await compare(password, user.motDePasseHash))) throw new UnauthorizedException('Identifiants invalides');
    return this.issueToken(user);
  }

  private async issueToken(user: User) {
    return { accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }), tokenType: 'Bearer' };
  }
}
