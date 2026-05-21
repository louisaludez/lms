import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
