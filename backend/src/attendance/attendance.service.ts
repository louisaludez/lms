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

  async getTodayLogs(): Promise<AttendanceLog[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.logRepo.find({
      where: { scannedAt: Between(start, end) },
      relations: ['user', 'user.department'],
      order: { scannedAt: 'DESC' },
    });
  }

  async getTodayCount(): Promise<{ entries: number; exits: number }> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [entries, exits] = await Promise.all([
      this.logRepo.count({
        where: { scannedAt: Between(start, end), entryType: EntryType.ENTRY },
      }),
      this.logRepo.count({
        where: { scannedAt: Between(start, end), entryType: EntryType.EXIT },
      }),
    ]);

    return { entries, exits };
  }
}
