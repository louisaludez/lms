import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'librarian', 'chief_librarian')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('high-demand')
  getHighDemandLowStock() {
    return this.reportsService.getHighDemandLowStock();
  }

  @Get('department-borrowing')
  getDepartmentBorrowing() {
    return this.reportsService.getDepartmentBorrowing();
  }

  @Get('visitor-statistics')
  getVisitorStatistics() {
    return this.reportsService.getVisitorStatistics();
  }

  @Get('book-requests')
  getBookRequestStats() {
    return this.reportsService.getBookRequestStats();
  }

  @Get('entry-exit')
  getEntryExitReport(
    @Query('frequency') frequency: string,
    @Query('department') department: string,
    @Query('year') year: string,
  ) {
    return this.reportsService.getEntryExitReport(frequency, department, year);
  }

  @Get('borrowed')
  getBorrowedReport(@Query('frequency') frequency: string) {
    return this.reportsService.getBorrowedReport(frequency);
  }

  @Get('returned')
  getReturnedReport(@Query('frequency') frequency: string) {
    return this.reportsService.getReturnedReport(frequency);
  }

  @Get('overdue')
  getOverdueReport(@Query('frequency') frequency: string) {
    return this.reportsService.getOverdueReport(frequency);
  }

  @Get('registered-users')
  getRegisteredUsersReport() {
    return this.reportsService.getRegisteredUsersReport();
  }

  @Get('inventory')
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get('new-acquisitions')
  getNewAcquisitionsReport() {
    return this.reportsService.getNewAcquisitionsReport();
  }
}
