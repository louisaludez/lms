import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum ActivityAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  BORROW = 'borrow',
  RETURN = 'return',
  EXTEND = 'extend',
  RESERVE = 'reserve',
  CANCEL_RESERVATION = 'cancel_reservation',
  REQUEST_BOOK = 'request_book',
  APPROVE_BOOK_REQUEST = 'approve_book_request',
  REJECT_BOOK_REQUEST = 'reject_book_request',
  EXPORT_REPORT = 'export_report',
  IMPORT_DATA = 'import_data',
  CHANGE_PASSWORD = 'change_password',
  UPDATE_PROFILE = 'update_profile',
}

export enum ActivityResource {
  USER = 'user',
  BOOK = 'book',
  CATEGORY = 'category',
  DEPARTMENT = 'department',
  TRANSACTION = 'transaction',
  BOOK_REQUEST = 'book_request',
  ATTENDANCE = 'attendance',
  REPORT = 'report',
  SETTINGS = 'settings',
  PROFILE = 'profile',
  AUTH = 'auth',
}

@Entity('activity_logs')
@Index(['userId', 'createdAt'])
@Index(['resource', 'resourceId'])
@Index(['action', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'enum', enum: ActivityAction })
  action: ActivityAction;

  @Column({ type: 'enum', enum: ActivityResource })
  resource: ActivityResource;

  @Column({ type: 'int', nullable: true })
  resourceId: number | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}