import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('librarian', 'chief_librarian', 'admin')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  /** GET /api/v1/activity-logs — List activity logs with filters and pagination */
  @Get()
  findAll(@Query() query: ActivityLogQueryDto) {
    return this.activityLogService.findAll(query);
  }

  /** GET /api/v1/activity-logs/stats — Get activity log statistics */
  @Get('stats')
  getStats() {
    return this.activityLogService.getStats();
  }

  /** GET /api/v1/activity-logs/recent — Get recent activity logs */
  @Get('recent')
  getRecent(@Query('limit') limit?: string) {
    return this.activityLogService.getRecentActivity(limit ? parseInt(limit, 10) : 10);
  }

  /** GET /api/v1/activity-logs/export — Export activity logs */
  @Get('export')
  async exportLogs(@Query() query: ActivityLogQueryDto, @Query('format') format: 'csv' | 'json' = 'csv', @Res() res: Response) {
    const data = await this.activityLogService.exportLogs(query, format);
    const filename = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    } else {
      res.setHeader('Content-Type', 'application/json');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  }

  /** GET /api/v1/activity-logs/:id — Get single activity log */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activityLogService.findOne(id);
  }
}