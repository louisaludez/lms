import { Controller, Post, UseGuards } from '@nestjs/common';
import { OverdueCronService } from './overdue-cron.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/cron')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CronController {
  constructor(private readonly cronService: OverdueCronService) {}

  /** POST /api/v1/admin/cron/run-overdue-check */
  @Post('run-overdue-check')
  runOverdueCheck() {
    return this.cronService.triggerManually();
  }
}
