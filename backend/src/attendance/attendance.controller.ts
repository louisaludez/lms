import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AttendanceService, ScanAttendanceDto, GetLogsQueryDto } from './attendance.service';
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

  /** GET /api/v1/attendance/logs — fetch logs with optional date range, type, search filters */
  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getLogs(@Query() query: GetLogsQueryDto) {
    return this.attendanceService.getLogs(query);
  }

  /** GET /api/v1/attendance/stats — fetch entry/exit summary stats with filters */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getStats(@Query() query: GetLogsQueryDto) {
    return this.attendanceService.getStats(query);
  }

  /** GET /api/v1/attendance/today */
  @Get('today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('librarian', 'chief_librarian', 'admin')
  getTodayLogs(@Query() query: GetLogsQueryDto) {
    return this.attendanceService.getLogs(query);
  }

  /** GET /api/v1/attendance/today/count */
  @Get('today/count')
  @UseGuards(JwtAuthGuard)
  getTodayCount(@Query() query: GetLogsQueryDto) {
    return this.attendanceService.getStats(query);
  }
}
