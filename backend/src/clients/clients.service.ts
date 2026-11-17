import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../database/entities.js';
import { CreateClientDto } from './client.dto.js';

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(Client) private readonly clients: Repository<Client>) {}
  all() { return this.clients.find({ relations: { utilisateur: true }, order: { nom: 'ASC', prenom: 'ASC' } }); }
  create(dto: CreateClientDto) { return this.clients.save(this.clients.create(Object.assign({}, dto, { utilisateurId: null, email: dto.email ?? null, societe: dto.societe ?? null, adresse: dto.adresse ?? null, notesAdmin: dto.notesAdmin ?? null }))); }
  async updateNotes(id: number, notesAdmin: string | null) {
    const client = await this.clients.findOneBy({ id });
    if (!client) throw new NotFoundException('Client introuvable');
    client.notesAdmin = notesAdmin;
    return this.clients.save(client);
  }
}
