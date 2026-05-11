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
import { Book } from './book.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum BookCondition {
  NEW = 'new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  DAMAGED = 'damaged',
  LOST = 'lost',
}

@Entity('book_copies')
export class BookCopy {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => Book, (book) => book.copies)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Index({ unique: true })
  @Column({ length: 60 })
  barcode: string;

  @Column({ name: 'copy_condition', type: 'enum', enum: BookCondition, default: BookCondition.GOOD })
  condition: BookCondition;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (tx) => tx.bookCopy)
  transactions: Transaction[];
}
