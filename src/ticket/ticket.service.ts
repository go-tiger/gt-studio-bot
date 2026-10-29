import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Ticket,
  TicketStatus,
  TicketType,
  TicketLauncher,
  ModLoader,
  GuildSettings,
} from '../core/entities/index.js';

export interface UserSelection {
  mcVersion?: string;
  modLoader?: string;
  loaderVersion?: string;
  interactionToken?: string;
  applicationId?: string;
}

@Injectable()
export class TicketService {
  private userSelections = new Map<string, UserSelection>();

  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(GuildSettings)
    private guildSettingsRepository: Repository<GuildSettings>,
    private dataSource: DataSource,
  ) {}

  // User selection methods
  setUserSelection(userId: string, data: UserSelection): void {
    this.userSelections.set(userId, data);
  }

  getUserSelection(userId: string): UserSelection | undefined {
    return this.userSelections.get(userId);
  }

  updateUserSelection(userId: string, data: Partial<UserSelection>): UserSelection {
    const existing = this.userSelections.get(userId) || {};
    const updated = { ...existing, ...data };
    this.userSelections.set(userId, updated);
    return updated;
  }

  clearUserSelection(userId: string): void {
    this.userSelections.delete(userId);
  }

  async getOrCreateGuildSettings(guild: string): Promise<GuildSettings> {
    let settings = await this.guildSettingsRepository.findOne({ where: { guild } });
    if (!settings) {
      settings = this.guildSettingsRepository.create({ guild });
      await this.guildSettingsRepository.save(settings);
    }
    return settings;
  }

  async updateGuildSettings(
    guild: string,
    data: Partial<GuildSettings>,
  ): Promise<GuildSettings> {
    const settings = await this.getOrCreateGuildSettings(guild);
    Object.assign(settings, data);
    return this.guildSettingsRepository.save(settings);
  }

  async createLauncherTicket(data: {
    guild: string;
    requester: string;
    note?: string;
    launcherName: string;
    folderName: string;
    minecraftVersion: string;
    modLoader: ModLoader;
    loaderVersion: string;
    launcherType: string;
    deadline: Date;
  }): Promise<Ticket> {
    return this.dataSource.transaction(async (manager) => {
      const ticket = manager.create(Ticket, {
        guild: data.guild,
        requester: data.requester,
        channel: '',
        type: TicketType.LAUNCHER,
        note: data.note,
        status: TicketStatus.PENDING,
      });
      await manager.save(ticket);

      const ticketLauncher = manager.create(TicketLauncher, {
        id: ticket.id,
        launcherName: data.launcherName,
        folderName: data.folderName,
        minecraftVersion: data.minecraftVersion,
        modLoader: data.modLoader,
        loaderVersion: data.loaderVersion,
        launcherType: data.launcherType,
        deadline: data.deadline,
      });
      await manager.save(ticketLauncher);

      return ticket;
    });
  }

  async setTicketChannel(id: number, channel: string): Promise<void> {
    await this.ticketRepository.update(id, { channel });
  }

  async getTicketByChannel(channel: string): Promise<Ticket | null> {
    return this.ticketRepository.findOne({ where: { channel } });
  }

  async updateTicketStatus(id: number, status: TicketStatus): Promise<Ticket | null> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) return null;
    ticket.status = status;
    return this.ticketRepository.save(ticket);
  }

  async updateTicketPrice(id: number, price: number): Promise<Ticket | null> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) return null;
    ticket.price = price;
    return this.ticketRepository.save(ticket);
  }

  async getTicketById(id: number): Promise<Ticket | null> {
    return this.ticketRepository.findOne({ where: { id } });
  }

  async getTicketLauncherByTicketId(id: number): Promise<TicketLauncher | null> {
    return this.dataSource
      .getRepository(TicketLauncher)
      .findOne({ where: { id } });
  }
}
