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

  async getDepartmentEntry() {
    return this.dataSource.query(`
      SELECT 
        d.id, 
        d.name, 
        d.code, 
        COUNT(a.id) as entryCount
      FROM departments d
      LEFT JOIN users u ON d.id = u.department_id
      LEFT JOIN attendance_logs a ON u.id = a.user_id AND a.entry_type = 'entry'
      GROUP BY d.id, d.name, d.code
      ORDER BY entryCount DESC, d.code ASC
    `);
  }


  async getVisitorStatistics() {
    return this.dataSource.query(`
      SELECT u.gender, COUNT(a.id) as visitorCount
      FROM attendance_logs a
      JOIN users u ON a.user_id = u.id
      WHERE u.gender IS NOT NULL AND a.entry_type = 'entry'
      GROUP BY u.gender
    `);
  }

  async getBookRequestStats() {
    return this.dataSource.query(`
      SELECT status, COUNT(id) as count
      FROM book_requests
      GROUP BY status
    `);
  }

  async getEntryExitReport(
    frequency: string,
    department: string,
    startDate: string,
    endDate: string,
  ) {
    let dateGroupSql = '';
    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (frequency === 'Daily') {
      dateGroupSql = `DATE_FORMAT(a.scanned_at, '%Y-%m-%d')`;
      if (startDate && endDate) {
        whereClauses.push(`DATE(a.scanned_at) >= ? AND DATE(a.scanned_at) <= ?`);
        queryParams.push(startDate, endDate);
      }
    } else if (frequency === 'Weekly') {
      dateGroupSql = `CONCAT(YEAR(a.scanned_at), '-W', LPAD(WEEK(a.scanned_at, 3), 2, '0'))`;
      const [startYearStr, startWeekStr] = (startDate || '').split('-W');
      const [endYearStr, endWeekStr] = (endDate || '').split('-W');
      if (startYearStr && startWeekStr && endYearStr && endWeekStr) {
        whereClauses.push(`CONCAT(YEAR(a.scanned_at), LPAD(WEEK(a.scanned_at, 3), 2, '0')) >= ? AND CONCAT(YEAR(a.scanned_at), LPAD(WEEK(a.scanned_at, 3), 2, '0')) <= ?`);
        queryParams.push(`${startYearStr}${startWeekStr}`, `${endYearStr}${endWeekStr}`);
      }
    } else if (frequency === 'Monthly') {
      dateGroupSql = `DATE_FORMAT(a.scanned_at, '%Y-%m')`;
      if (startDate && endDate) {
        whereClauses.push(`DATE_FORMAT(a.scanned_at, '%Y-%m') >= ? AND DATE_FORMAT(a.scanned_at, '%Y-%m') <= ?`);
        queryParams.push(startDate, endDate);
      }
    } else {
      dateGroupSql = `YEAR(a.scanned_at)`;
      if (startDate && endDate) {
        whereClauses.push(`YEAR(a.scanned_at) >= ? AND YEAR(a.scanned_at) <= ?`);
        queryParams.push(startDate, endDate);
      }
    }

    if (department && department !== 'All' && department !== 'All Departments') {
      whereClauses.push('(d.name = ? OR d.code = ? OR d.name LIKE ?)');
      queryParams.push(department, department, `%${department}%`);
    }

    if (whereClauses.length === 0) {
      whereClauses.push('1=1');
    }

    return this.dataSource.query(
      `
      SELECT 
        ${dateGroupSql} as period,
        COUNT(CASE WHEN a.entry_type = 'entry' THEN 1 END) as entries,
        COUNT(CASE WHEN a.entry_type = 'exit' THEN 1 END) as exits
      FROM attendance_logs a
      JOIN users u ON a.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY period
      ORDER BY period ASC
    `,
      queryParams,
    );
  }

  async getBorrowedReport(frequency: string) {
    const dateGroupSql =
      frequency === 'Monthly'
        ? `DATE_FORMAT(t.checkout_date, '%Y-%m')`
        : `YEAR(t.checkout_date)`;
    return this.dataSource.query(`
      SELECT 
        ${dateGroupSql} as period,
        b.main_title as title,
        COUNT(t.id) as borrowCount
      FROM transactions t
      JOIN book_copies bc ON t.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      WHERE t.transaction_type IN ('checkout', 'renewal')
      GROUP BY period, b.id
      ORDER BY period DESC, borrowCount DESC
      LIMIT 100
    `);
  }

  async getReturnedReport(frequency: string) {
    const dateGroupSql =
      frequency === 'Monthly'
        ? `DATE_FORMAT(t.return_date, '%Y-%m')`
        : `YEAR(t.return_date)`;
    return this.dataSource.query(`
      SELECT 
        ${dateGroupSql} as period,
        b.main_title as title,
        COUNT(t.id) as returnCount
      FROM transactions t
      JOIN book_copies bc ON t.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      WHERE t.status = 'returned' AND t.return_date IS NOT NULL
      GROUP BY period, b.id
      ORDER BY period DESC, returnCount DESC
      LIMIT 100
    `);
  }

  async getOverdueReport(frequency: string) {
    const dateGroupSql =
      frequency === 'Monthly'
        ? `DATE_FORMAT(t.due_date, '%Y-%m')`
        : `YEAR(t.due_date)`;
    return this.dataSource.query(`
      SELECT 
        ${dateGroupSql} as period,
        u.first_name,
        u.last_name,
        b.main_title as title,
        t.due_date,
        GREATEST(IFNULL(t.overdue_days, 0), GREATEST(0, DATEDIFF(CURDATE(), t.due_date))) as overdue_days,
        GREATEST(IFNULL(t.fine_amount, 0), GREATEST(0, DATEDIFF(CURDATE(), t.due_date) * 5)) as fine_amount
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN book_copies bc ON t.book_copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      WHERE t.status = 'overdue' OR t.overdue_days > 0 OR (t.status = 'active' AND t.due_date < CURDATE())
      ORDER BY period DESC, overdue_days DESC
      LIMIT 100
    `);
  }

  async getRegisteredUsersReport() {
    return this.dataSource.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.account_approval_status, d.name as department
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY d.name, u.last_name, u.first_name
    `);
  }

  async getInventoryReport() {
    return this.dataSource.query(`
      SELECT 
        b.main_title as title,
        b.isbn,
        c.name as category,
        b.total_copies,
        b.available_copies,
        (SELECT COUNT(*) FROM transactions t JOIN book_copies bc ON t.book_copy_id = bc.id WHERE bc.book_id = b.id AND t.status IN ('active', 'overdue')) as checked_out_copies
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.main_title ASC
    `);
  }

  async getNewAcquisitionsReport() {
    return this.dataSource.query(`
      SELECT 
        main_title as title,
        isbn,
        created_at as acquisition_date
      FROM books
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)
      ORDER BY created_at DESC
    `);
  }
}
