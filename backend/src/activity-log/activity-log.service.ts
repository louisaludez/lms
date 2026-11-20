import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, ILike, FindOptionsWhere } from 'typeorm';
import { ActivityLog, ActivityAction, ActivityResource } from './activity-log.entity';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { User } from '../users/entities/user.entity';

// Re-export enums for other modules to use
export { ActivityAction, ActivityResource };

export interface LogActivityParams {
  userId?: number | null;
  action: ActivityAction;
  resource: ActivityResource;
  resourceId?: number | null;
  metadata?: Record<string, any>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async logActivity(params: LogActivityParams): Promise<ActivityLog> {
    try {
      const activityLog = this.activityLogRepository.create({
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        metadata: params.metadata ?? null,
        description: params.description ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      });

      return await this.activityLogRepository.save(activityLog);
    } catch (error) {
      this.logger.error('Failed to log activity', error);
      // Don't throw - logging should not break the main operation
      return null as any;
    }
  }

  async findAll(query: ActivityLogQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      action,
      resource,
      userId,
      resourceId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<ActivityLog> = {};

    if (search) {
      where.description = ILike(`%${search}%`);
    }

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (userId) {
      where.userId = userId;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = Between(new Date(startDate), new Date());
    } else if (endDate) {
      where.createdAt = Between(new Date('1970-01-01'), new Date(endDate));
    }

    const [items, total] = await this.activityLogRepository.findAndCount({
      where,
      relations: ['user'],
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<ActivityLog | null> {
    return this.activityLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async getStats(): Promise<{
    totalLogs: number;
    todayLogs: number;
    thisWeekLogs: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
  }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    const [totalLogs, todayLogs, thisWeekLogs, byAction, byResource] = await Promise.all([
      this.activityLogRepository.count(),
      this.activityLogRepository.count({
        where: { createdAt: Between(startOfToday, now) },
      }),
      this.activityLogRepository.count({
        where: { createdAt: Between(startOfWeek, now) },
      }),
      this.activityLogRepository
        .createQueryBuilder('log')
        .select('log.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.action')
        .getRawMany(),
      this.activityLogRepository
        .createQueryBuilder('log')
        .select('log.resource', 'resource')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.resource')
        .getRawMany(),
    ]);

    return {
      totalLogs,
      todayLogs,
      thisWeekLogs,
      byAction: byAction.reduce((acc, item) => ({ ...acc, [item.action]: parseInt(item.count) }), {}),
      byResource: byResource.reduce((acc, item) => ({ ...acc, [item.resource]: parseInt(item.count) }), {}),
    };
  }

  async getRecentActivity(limit: number = 10): Promise<ActivityLog[]> {
    return this.activityLogRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Helper methods for common actions
  async logLogin(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logActivity({
      userId: user.id,
      action: ActivityAction.LOGIN,
      resource: ActivityResource.AUTH,
      description: `User ${user.email} logged in`,
      ipAddress,
      userAgent,
    });
  }

  async logLogout(user: User, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logActivity({
      userId: user.id,
      action: ActivityAction.LOGOUT,
      resource: ActivityResource.AUTH,
      description: `User ${user.email} logged out`,
      ipAddress,
      userAgent,
    });
  }

  async logCreate(
    userId: number | null,
    resource: ActivityResource,
    resourceId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.CREATE,
      resource,
      resourceId,
      metadata,
      description: `Created ${resource} #${resourceId}`,
      ipAddress,
      userAgent,
    });
  }

  async logUpdate(
    userId: number | null,
    resource: ActivityResource,
    resourceId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.UPDATE,
      resource,
      resourceId,
      metadata,
      description: `Updated ${resource} #${resourceId}`,
      ipAddress,
      userAgent,
    });
  }

  async logDelete(
    userId: number | null,
    resource: ActivityResource,
    resourceId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.DELETE,
      resource,
      resourceId,
      metadata,
      description: `Deleted ${resource} #${resourceId}`,
      ipAddress,
      userAgent,
    });
  }

  async logApprove(
    userId: number | null,
    resource: ActivityResource,
    resourceId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.APPROVE,
      resource,
      resourceId,
      metadata,
      description: `Approved ${resource} #${resourceId}`,
      ipAddress,
      userAgent,
    });
  }

  async logReject(
    userId: number | null,
    resource: ActivityResource,
    resourceId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.REJECT,
      resource,
      resourceId,
      metadata,
      description: `Rejected ${resource} #${resourceId}`,
      ipAddress,
      userAgent,
    });
  }

  async logBorrow(
    userId: number,
    bookId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.BORROW,
      resource: ActivityResource.TRANSACTION,
      resourceId: bookId,
      metadata,
      description: `Borrowed book #${bookId}`,
      ipAddress,
      userAgent,
    });
  }

  async logReturn(
    userId: number,
    bookId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.RETURN,
      resource: ActivityResource.TRANSACTION,
      resourceId: bookId,
      metadata,
      description: `Returned book #${bookId}`,
      ipAddress,
      userAgent,
    });
  }

  async logExtend(
    userId: number,
    bookId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.EXTEND,
      resource: ActivityResource.TRANSACTION,
      resourceId: bookId,
      metadata,
      description: `Extended loan for book #${bookId}`,
      ipAddress,
      userAgent,
    });
  }

  async logReserve(
    userId: number,
    bookId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.RESERVE,
      resource: ActivityResource.BOOK,
      resourceId: bookId,
      metadata,
      description: `Reserved book #${bookId}`,
      ipAddress,
      userAgent,
    });
  }

  async logCancelReservation(
    userId: number,
    bookId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.CANCEL_RESERVATION,
      resource: ActivityResource.BOOK,
      resourceId: bookId,
      metadata,
      description: `Cancelled reservation for book #${bookId}`,
      ipAddress,
      userAgent,
    });
  }

  async logBookRequest(
    userId: number,
    requestId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.REQUEST_BOOK,
      resource: ActivityResource.BOOK_REQUEST,
      resourceId: requestId,
      metadata,
      description: `Requested book #${requestId}`,
      ipAddress,
      userAgent,
    });
  }

  async logApproveBookRequest(
    userId: number | null,
    requestId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.APPROVE_BOOK_REQUEST,
      resource: ActivityResource.BOOK_REQUEST,
      resourceId: requestId,
      metadata,
      description: `Approved book request #${requestId}`,
      ipAddress,
      userAgent,
    });
  }

  async logRejectBookRequest(
    userId: number | null,
    requestId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.REJECT_BOOK_REQUEST,
      resource: ActivityResource.BOOK_REQUEST,
      resourceId: requestId,
      metadata,
      description: `Rejected book request #${requestId}`,
      ipAddress,
      userAgent,
    });
  }

  async logExportReport(
    userId: number | null,
    reportType: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.EXPORT_REPORT,
      resource: ActivityResource.REPORT,
      metadata: { reportType, ...metadata },
      description: `Exported ${reportType} report`,
      ipAddress,
      userAgent,
    });
  }

  async logChangePassword(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.CHANGE_PASSWORD,
      resource: ActivityResource.PROFILE,
      description: `Changed password`,
      ipAddress,
      userAgent,
    });
  }

  async logUpdateProfile(
    userId: number,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.logActivity({
      userId,
      action: ActivityAction.UPDATE_PROFILE,
      resource: ActivityResource.PROFILE,
      metadata,
      description: `Updated profile`,
      ipAddress,
      userAgent,
    });
  }

  async exportLogs(query: ActivityLogQueryDto, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const {
      search,
      action,
      resource,
      userId,
      resourceId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: FindOptionsWhere<ActivityLog> = {};

    if (search) {
      where.description = ILike(`%${search}%`);
    }
    if (action) {
      where.action = action;
    }
    if (resource) {
      where.resource = resource;
    }
    if (userId) {
      where.userId = userId;
    }
    if (resourceId) {
      where.resourceId = resourceId;
    }
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = Between(new Date(startDate), new Date());
    } else if (endDate) {
      where.createdAt = Between(new Date('1970-01-01'), new Date(endDate));
    }

    const items = await this.activityLogRepository.find({
      where,
      relations: ['user'],
      order: { [sortBy]: sortOrder },
    });

    if (format === 'csv') {
      const headers = ['ID', 'Date', 'Action', 'Resource', 'Resource ID', 'Description', 'User', 'User ID', 'IP Address', 'User Agent', 'Metadata'];
      const rows = items.map(log => [
        log.id,
        log.createdAt.toISOString(),
        log.action,
        log.resource,
        log.resourceId || '',
        (log.description || '').replace(/"/g, '""'),
        log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        log.userId || '',
        log.ipAddress || '',
        (log.userAgent || '').replace(/"/g, '""'),
        log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '',
      ]);
      return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    } else {
      return JSON.stringify(items, null, 2);
    }
  }
}