import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BookCopy } from '../../books/entities/book-copy.entity';

export enum TransactionType {
  CHECKOUT = 'checkout',
  RETURN = 'return',
  RENEWAL = 'renewal',
  LOST = 'lost',
}

export enum TransactionStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
  LOST = 'lost',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: User;

  @ManyToOne(() => BookCopy, (copy) => copy.transactions)
  @JoinColumn({ name: 'book_copy_id' })
  bookCopy: BookCopy;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'librarian_id' })
  librarian: User;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.CHECKOUT,
  })
  transactionType: TransactionType;

  @CreateDateColumn({ name: 'checkout_date' })
  checkoutDate: Date;

  @Column({ name: 'due_date', type: 'date' })
  @Index()
  dueDate: string;

  @Column({ name: 'return_date', nullable: true })
  returnDate: Date;

  @Column({
    name: 'renewal_count',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  renewalCount: number;

  @Column({
    name: 'overdue_days',
    type: 'smallint',
    unsigned: true,
    default: 0,
  })
  overdueDays: number;

  @Column({
    name: 'fine_amount',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  fineAmount: number;

  @Column({ name: 'fine_paid', type: 'tinyint', width: 1, default: 0 })
  finePaid: boolean;

  @Column({ name: 'fine_paid_at', nullable: true })
  finePaidAt: Date;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.ACTIVE,
  })
  @Index()
  status: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
