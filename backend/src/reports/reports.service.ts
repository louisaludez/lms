import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(private dataSource: DataSource) {}

  async getHighDemandLowStock() {
    return this.dataSource.query(`
      SELECT b.id, b.main_title as title, b.isbn, b.available_copies as availableCopies, COUNT(t.id) as borrowCount
      FROM books b
      JOIN book_copies bc ON b.id = bc.book_id
      JOIN transactions t ON bc.id = t.book_copy_id
      WHERE t.transaction_type IN ('checkout', 'renewal')
      GROUP BY b.id
      ORDER BY borrowCount DESC, availableCopies ASC
      LIMIT 20
    `);
  }

  async getDepartmentBorrowing() {
    return this.dataSource.query(`
      SELECT d.name, d.code, COUNT(t.id) as borrowCount
      FROM departments d
      JOIN users u ON d.id = u.department_id
      JOIN transactions t ON u.id = t.user_id
      WHERE t.transaction_type IN ('checkout', 'renewal')
      GROUP BY d.id
      ORDER BY borrowCount DESC
    `);
  }

  async getVisitorStatistics() {
    return this.dataSource.query(`
      SELECT u.gender, COUNT(a.id) as visitorCount
      FROM attendance_logs a
      JOIN users u ON a.user_id = u.id
      WHERE u.gender IS NOT NULL
      GROUP BY u.gender
    `);
  }
}
