import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
} from '../transactions/entities/transaction.entity';
import { User, EligibilityStatus } from '../users/entities/user.entity';
import { differenceInDays } from 'date-fns';
import { ConfigService } from '@nestjs/config';

interface OverdueSanctionLog {
  transaction_id: number;
  user_id: number;
  action_taken: string;
  previous_status: string | null;
  new_status: string | null;
  fine_amount: number | null;
  notes: string;
}

@Injectable()
export class OverdueCronService {
  private readonly logger = new Logger(OverdueCronService.name);
  private readonly finePerDay: number;

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {
    this.finePerDay = this.config.get<number>('FINE_PER_DAY', 5);
  }

  /**
   * Runs every day at 00:05 AM.
   * 1. Finds all active transactions where due_date < TODAY
   * 2. Marks them OVERDUE and calculates accumulated fines
   * 3. Suspends users who have any overdue item
   * 4. Logs all actions to overdue_sanction_logs
   */
  @Cron('5 0 * * *', { name: 'daily-overdue-check', timeZone: 'Asia/Manila' })
  async runDailyOverdueCheck(): Promise<void> {
    this.logger.log('⏰ [CRON] Daily overdue check started...');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all active transactions that are past their due date
    const overdueTransactions = await this.txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.user', 'user')
      .leftJoinAndSelect('tx.bookCopy', 'copy')
      .leftJoinAndSelect('copy.book', 'book')
      .where('tx.status IN (:...statuses)', {
        statuses: [TransactionStatus.ACTIVE, TransactionStatus.OVERDUE],
      })
      .andWhere('tx.due_date < :today', { today: todayStr })
      .getMany();

    if (overdueTransactions.length === 0) {
      this.logger.log('[CRON] No overdue transactions found. ✅');
      return;
    }

    this.logger.warn(
      `[CRON] Found ${overdueTransactions.length} overdue transaction(s)`,
    );

    const sanctionLogs: OverdueSanctionLog[] = [];
    const usersToSuspend = new Set<number>();

    for (const tx of overdueTransactions) {
      const dueDate = new Date(tx.dueDate);
      const overdueDays = Math.max(0, differenceInDays(today, dueDate));
      const newFine = overdueDays * this.finePerDay;

      // Update transaction
      tx.status = TransactionStatus.OVERDUE;
      tx.overdueDays = overdueDays;
      tx.fineAmount = newFine;

      await this.txRepo.save(tx);

      sanctionLogs.push({
        transaction_id: tx.id,
        user_id: tx.user.id,
        action_taken: 'flagged_overdue',
        previous_status: null,
        new_status: null,
        fine_amount: newFine,
        notes: `Flagged as overdue. Days overdue: ${overdueDays}. Fine: ₱${newFine.toFixed(2)}`,
      });

      // Track user for suspension
      usersToSuspend.add(tx.user.id);
    }

    // Suspend all users with overdue items
    for (const userId of usersToSuspend) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) continue;

      if (
        user.eligibilityStatus !== EligibilityStatus.SUSPENDED &&
        user.eligibilityStatus !== EligibilityStatus.EXPELLED
      ) {
        const previousStatus = user.eligibilityStatus;
        user.eligibilityStatus = EligibilityStatus.SUSPENDED;
        await this.userRepo.save(user);

        this.logger.warn(
          `[CRON] User #${userId} (${user.institutionalId}) suspended`,
        );

        sanctionLogs.push({
          transaction_id: overdueTransactions.find(
            (tx) => tx.user.id === userId,
          )!.id,
          user_id: userId,
          action_taken: 'suspended',
          previous_status: previousStatus,
          new_status: EligibilityStatus.SUSPENDED,
          fine_amount: null,
          notes: `Account suspended due to ${overdueTransactions.filter((tx) => tx.user.id === userId).length} overdue item(s)`,
        });
      }
    }

    // Bulk insert sanction logs
    if (sanctionLogs.length > 0) {
      await this.txRepo.manager
        .createQueryBuilder()
        .insert()
        .into('overdue_sanction_logs')
        .values(
          sanctionLogs.map((log) => ({
            transaction_id: log.transaction_id,
            user_id: log.user_id,
            action_taken: log.action_taken,
            previous_status: log.previous_status,
            new_status: log.new_status,
            fine_amount: log.fine_amount,
            notes: log.notes,
          })),
        )
        .execute();
    }

    this.logger.log(
      `[CRON] Done. Flagged: ${overdueTransactions.length}, Suspended: ${usersToSuspend.size}`,
    );
  }

  /**
   * Runs every Sunday at 10:00 AM — expire pending reservations older than RESERVATION_EXPIRY_DAYS
   */
  @Cron('0 10 * * 0', {
    name: 'weekly-reservation-cleanup',
    timeZone: 'Asia/Manila',
  })
  async expireReservations(): Promise<void> {
    this.logger.log('[CRON] Running reservation expiry cleanup...');
    const result = await this.txRepo.manager
      .createQueryBuilder()
      .update('reservations')
      .set({ status: 'expired' })
      .where('status = :pending', { pending: 'pending' })
      .andWhere('expires_at < NOW()')
      .execute();
    this.logger.log(`[CRON] Expired ${result.affected} reservation(s)`);
  }

  /**
   * Manually trigger the overdue check (callable from admin endpoints)
   */
  async triggerManually(): Promise<{ message: string }> {
    await this.runDailyOverdueCheck();
    return { message: 'Overdue check completed successfully' };
  }
}
