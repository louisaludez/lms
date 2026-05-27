import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AttendanceService, ScanAttendanceDto } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /** POST /api/v1/attendance/scan — scan barcode for entry/exit */
  @Post('scan')
  scan(@Body() dto: ScanAttendanceDto) {
    return this.attendanceService.scan(dto);
  }

  /** GET /api/v1/attendance/today */
  @Get('today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getTodayLogs() {
    return this.attendanceService.getTodayLogs();
  }

  /** GET /api/v1/attendance/today/count */
  @Get('today/count')
  @UseGuards(JwtAuthGuard)
  getTodayCount() {
    return this.attendanceService.getTodayCount();
  }
}
