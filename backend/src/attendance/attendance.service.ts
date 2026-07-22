import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AttendanceLog, EntryType } from './entities/attendance-log.entity';
import { User } from '../users/entities/user.entity';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  userBarcode: string;

  @IsOptional()
  @IsEnum(EntryType)
  entryType?: EntryType;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class GetLogsQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(EntryType)
  entryType?: EntryType;

  @IsOptional()
  @IsString()
  search?: string;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceLog)
    private readonly logRepo: Repository<AttendanceLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async scan(dto: ScanAttendanceDto): Promise<AttendanceLog> {
    const user = await this.userRepo.findOne({
      where: { barcode: dto.userBarcode },
    });
    if (!user)
      throw new NotFoundException(
        `No user found with barcode "${dto.userBarcode}"`,
      );

    let finalEntryType = dto.entryType;
    if (!finalEntryType) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const lastLog = await this.logRepo.findOne({
        where: { user: { id: user.id }, scannedAt: Between(start, end) },
        order: { scannedAt: 'DESC' },
      });

      if (!lastLog || lastLog.entryType === EntryType.EXIT) {
        finalEntryType = EntryType.ENTRY;
      } else {
        finalEntryType = EntryType.EXIT;
      }
    }

    const log = this.logRepo.create({
      user,
      entryType: finalEntryType,
      purpose: dto.purpose,
    });

    return this.logRepo.save(log);
  }

  private buildFilterQuery(dto: GetLogsQueryDto) {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('user.department', 'department');

    if (dto.startDate && dto.startDate.trim() !== '') {
      const start = new Date(dto.startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere('log.scannedAt >= :start', { start });
    }

    if (dto.endDate && dto.endDate.trim() !== '') {
      const end = new Date(dto.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('log.scannedAt <= :end', { end });
    }

    if (dto.entryType) {
      qb.andWhere('log.entryType = :entryType', { entryType: dto.entryType });
    }

    if (dto.search && dto.search.trim() !== '') {
      const s = `%${dto.search.trim()}%`;
      qb.andWhere(
        '(user.firstName LIKE :s OR user.lastName LIKE :s OR user.barcode LIKE :s OR user.email LIKE :s OR department.name LIKE :s OR department.code LIKE :s)',
        { s },
      );
    }

    return qb;
  }

  async getLogs(dto: GetLogsQueryDto = {}): Promise<AttendanceLog[]> {
    const qb = this.buildFilterQuery(dto);
    qb.orderBy('log.scannedAt', 'DESC');
    return qb.getMany();
  }

  async getStats(
    dto: GetLogsQueryDto = {},
  ): Promise<{ entries: number; exits: number; total: number }> {
    const qb = this.buildFilterQuery(dto);

    const entriesQb = qb
      .clone()
      .andWhere('log.entryType = :type', { type: EntryType.ENTRY });
    const exitsQb = qb
      .clone()
      .andWhere('log.entryType = :type', { type: EntryType.EXIT });

    const [entries, exits] = await Promise.all([
      entriesQb.getCount(),
      exitsQb.getCount(),
    ]);

    return { entries, exits, total: entries + exits };
  }

  async getTodayLogs(queryDto: GetLogsQueryDto = {}): Promise<AttendanceLog[]> {
    const todayStr = new Date().toISOString().split('T')[0];
    const dto = {
      startDate: queryDto.startDate || todayStr,
      endDate: queryDto.endDate || todayStr,
      ...queryDto,
    };
    return this.getLogs(dto);
  }

  async getTodayCount(queryDto: GetLogsQueryDto = {}): Promise<{ entries: number; exits: number; total: number }> {
    const todayStr = new Date().toISOString().split('T')[0];
    const dto = {
      startDate: queryDto.startDate || todayStr,
      endDate: queryDto.endDate || todayStr,
      ...queryDto,
    };
    return this.getStats(dto);
  }
}
