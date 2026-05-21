import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CronModule } from './cron/cron.module';
import { ReservationsModule } from './reservations/reservations.module';
import { BookRequestsModule } from './book-requests/book-requests.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // Use migrations in production
        logging: config.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
    }),
    AuthModule,
    UsersModule,
    BooksModule,
    TransactionsModule,
    AttendanceModule,
    ReservationsModule,
    BookRequestsModule,
    CronModule,
    ReportsModule,
  ],
})
export class AppModule {}
