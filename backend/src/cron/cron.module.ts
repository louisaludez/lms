import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { OverdueCronService } from './overdue-cron.service';
import { CronController } from './cron.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User])],
  providers: [OverdueCronService],
  controllers: [CronController],
  exports: [OverdueCronService],
})
export class CronModule {}
