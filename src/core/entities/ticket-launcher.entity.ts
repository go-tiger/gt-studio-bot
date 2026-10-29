import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity.js';

export enum ModLoader {
  FORGE = 'Forge',
  FABRIC = 'Fabric',
  NEOFORGE = 'NeoForge',
}

@Entity('ticket_launchers')
export class TicketLauncher {
  @PrimaryColumn()
  id: number;

  @OneToOne(() => Ticket)
  @JoinColumn({ name: 'id' })
  ticket: Ticket;

  @Column()
  launcherName: string;

  @Column()
  folderName: string;

  @Column()
  minecraftVersion: string;

  @Column({ type: 'enum', enum: ModLoader })
  modLoader: ModLoader;

  @Column()
  loaderVersion: string;

  @Column({ nullable: true })
  launcherType: string;

  @Column()
  deadline: Date;
}
