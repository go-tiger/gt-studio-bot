import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum TicketType {
  LAUNCHER = 'LAUNCHER',
}

export enum TicketStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
}

export const TicketStatusLabel: Record<TicketStatus, string> = {
  [TicketStatus.PENDING]: '대기 중',
  [TicketStatus.ACCEPTED]: '수락됨',
  [TicketStatus.IN_PROGRESS]: '작업 중',
  [TicketStatus.PAYMENT_PENDING]: '결제 대기',
  [TicketStatus.REVIEW]: '검토 중',
  [TicketStatus.COMPLETED]: '완료',
};

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  guild: string;

  @Column()
  requester: string;

  @Column()
  channel: string;

  @Column({ type: 'enum', enum: TicketType })
  type: TicketType;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'enum', enum: TicketStatus })
  status: TicketStatus;

  @Column({ nullable: true })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
