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
import { Category } from './category.entity';
import { BookCopy } from './book-copy.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Index({ unique: true })
  @Column({ length: 20 })
  isbn: string;

  @Index({ unique: true })
  @Column({ name: 'call_number', length: 60 })
  callNumber: string;

  @Column({ name: 'main_title', length: 512 })
  title: string;

  @Column({ name: 'other_title', length: 512, nullable: true })
  otherTitle: string;

  @Column({ length: 30, nullable: true })
  edition: string;

  @Column({ length: 200, nullable: true })
  publisher: string;

  @Column({ name: 'publish_year', type: 'smallint', nullable: true })
  publishYear: number;

  @ManyToOne(() => Category, (cat) => cat.books, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 50, default: 'English' })
  language: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'cover_image_url', length: 512, nullable: true })
  coverImageUrl: string;

  @Column({
    name: 'total_copies',
    type: 'smallint',
    unsigned: true,
    default: 1,
  })
  totalCopies: number;

  @Column({
    name: 'available_copies',
    type: 'smallint',
    unsigned: true,
    default: 1,
  })
  availableCopies: number;

  @Column({ name: 'location_shelf', length: 80, nullable: true })
  locationShelf: string;

  @Column({ name: 'is_reference_only', type: 'tinyint', width: 1, default: 0 })
  isReferenceOnly: boolean;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => BookCopy, (copy) => copy.book, { cascade: true })
  copies: BookCopy[];

  @OneToMany(() => Reservation, (res) => res.book)
  reservations: Reservation[];

  // Virtual field – populated in service
  authors?: string[];
}
