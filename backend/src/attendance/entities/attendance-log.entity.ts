import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum EntryType {
  ENTRY = 'entry',
  EXIT = 'exit',
}

@Entity('attendance_logs')
export class AttendanceLog {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => User, (user) => user.attendanceLogs)
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: User;

  @Column({
    name: 'entry_type',
    type: 'enum',
    enum: EntryType,
    default: EntryType.ENTRY,
  })
  entryType: EntryType;

  @Index()
  @CreateDateColumn({ name: 'scanned_at' })
  scannedAt: Date;

  @Column({ length: 120, nullable: true })
  purpose: string;

  @Column({ length: 255, nullable: true })
  remarks: string;
}
