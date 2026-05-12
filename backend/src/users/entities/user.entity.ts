import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Department } from './department.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { AttendanceLog } from '../../attendance/entities/attendance-log.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { BookRequest } from '../../book-requests/entities/book-request.entity';

export enum UserRole {
  STUDENT = 'student',
  FACULTY = 'faculty',
  LIBRARIAN = 'librarian',
  ADMIN = 'admin',
}

export enum EligibilityStatus {
  ELIGIBLE = 'eligible',
  SUSPENDED = 'suspended',
  EXPELLED = 'expelled',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Index({ unique: true })
  @Column({ name: 'institutional_id', length: 30 })
  institutionalId: string;

  @Index({ unique: true })
  @Column({ length: 60 })
  barcode: string;

  @Index({ unique: true })
  @Column({ length: 180 })
  email: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'first_name', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', length: 80 })
  lastName: string;

  @Column({ name: 'middle_name', length: 80, nullable: true })
  middleName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @ManyToOne(() => Department, (dept) => dept.users, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({
    name: 'year_level',
    type: 'tinyint',
    unsigned: true,
    nullable: true,
  })
  yearLevel: number;

  @Column({ length: 20, nullable: true })
  section: string;

  @Column({ name: 'profile_photo_url', length: 512, nullable: true })
  profilePhotoUrl: string;

  @Column({
    name: 'eligibility_status',
    type: 'enum',
    enum: EligibilityStatus,
    default: EligibilityStatus.ELIGIBLE,
  })
  @Index()
  eligibilityStatus: EligibilityStatus;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (tx) => tx.user)
  transactions: Transaction[];

  @OneToMany(() => AttendanceLog, (log) => log.user)
  attendanceLogs: AttendanceLog[];

  @OneToMany(() => Reservation, (res) => res.user)
  reservations: Reservation[];

  @OneToMany(() => BookRequest, (br) => br.user)
  bookRequests: BookRequest[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
