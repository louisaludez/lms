import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Book } from './book.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Book, (book) => book.category)
  books: Book[];
}
