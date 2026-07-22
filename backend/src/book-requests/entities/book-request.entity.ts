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
import { Book } from '../../books/entities/book.entity';
import { Category } from '../../books/entities/category.entity';

export enum BookRequestType {
  BORROW = 'borrow',
  ACQUISITION = 'acquisition',
}

export enum BookRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FULFILLED = 'fulfilled',
}

@Entity('book_requests')
export class BookRequest {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => User, (user) => user.bookRequests)
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: User;

  @ManyToOne(() => Book, { nullable: true })
  @JoinColumn({ name: 'book_id' })
  @Index()
  book: Book | null;

  @Column({ name: 'item_type', type: 'varchar', length: 100, default: 'BOOKS' })
  itemType: string;

  /** For acquisition requests — title of the book being requested */
  @Column({ type: 'varchar', length: 512, nullable: true })
  title: string | null;

  @Column({ name: 'other_title', type: 'varchar', length: 512, nullable: true })
  otherTitle: string | null;

  /** For acquisition requests — author of the book being requested */
  @Column({ type: 'varchar', length: 200, nullable: true })
  author: string | null;

  /** For acquisition requests */
  @Column({ type: 'varchar', length: 50, nullable: true })
  isbn: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  issn: string | null;

  @Column({ name: 'call_number', type: 'varchar', length: 100, nullable: true })
  callNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  edition: string | null;

  @Column({ name: 'publish_year', type: 'int', nullable: true })
  publishYear: number | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  /** For acquisition requests */
  @Column({ type: 'varchar', length: 200, nullable: true })
  publisher: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'English' })
  language: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'location_shelf', type: 'varchar', length: 100, nullable: true })
  locationShelf: string | null;

  @Column({
    name: 'request_type',
    type: 'enum',
    enum: BookRequestType,
    default: BookRequestType.BORROW,
  })
  requestType: BookRequestType;

  /** Faculty's reason / justification for the request */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: BookRequestStatus,
    default: BookRequestStatus.PENDING,
  })
  @Index()
  status: BookRequestStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'librarian_id' })
  librarian: User | null;

  @Column({ name: 'librarian_notes', type: 'text', nullable: true })
  librarianNotes: string | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
