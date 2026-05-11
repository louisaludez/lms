import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceLog } from './entities/attendance-log.entity';
import { User } from '../users/entities/user.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceLog, User])],
  providers: [AttendanceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
