import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, UserRole, AccountApprovalStatus } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Like } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { ActivityLogService, ActivityAction, ActivityResource } from '../activity-log/activity-log.service';

function roleUsesDepartment(role: UserRole): boolean {
  return role === UserRole.STUDENT || role === UserRole.FACULTY;
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async onModuleInit() {
    await this.seedDepartments();
  }

  async seedDepartments() {
    const depts = [
      { name: 'TVL', code: 'TVL' },
      { name: 'GAS', code: 'GAS' },
      { name: 'HUMSS', code: 'HUMSS' },
      { name: 'STEM', code: 'STEM' },
      { name: 'AB English', code: 'AB-ENG' },
      { name: 'BS Midwifery', code: 'BS-MID' },
      { name: 'BEEd', code: 'BEED' },
      { name: 'BSED major in English', code: 'BSED-ENG' },
      { name: 'BSED major in Mathematics', code: 'BSED-MATH' },
      { name: 'Bachelor of Arts (AB): English Language', code: 'AB-EL' },
      { name: 'Bachelor of Elementary Education (BEEd): Generalist', code: 'BEEd-Gen' },
      { name: 'Bachelor of Secondary Education (BSEd): Majors in English and Mathematics', code: 'BSEd-EM' },
      { name: 'Bachelor of Science (BS): Midwifery', code: 'BS-Midwifery' },
      { name: 'Elementary', code: 'ELEM' },
      { name: 'Highschool', code: 'JHS' },
      { name: 'Senior High School', code: 'SHS' },
    ];

    for (const dept of depts) {
      const existing = await this.deptRepo.findOne({
        where: [{ name: dept.name }, { code: dept.code }],
      });
      if (!existing) {
        await this.deptRepo.save(this.deptRepo.create(dept));
      } else if (existing.name !== dept.name || existing.code !== dept.code) {
        existing.name = dept.name;
        existing.code = dept.code;
        await this.deptRepo.save(existing);
      }
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const relayUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const relayToken = process.env.GOOGLE_APPS_SCRIPT_TOKEN;

    if (relayUrl || relayToken) {
      if (!relayUrl || !relayToken) {
        throw new Error(
          'GOOGLE_APPS_SCRIPT_URL and GOOGLE_APPS_SCRIPT_TOKEN must both be configured',
        );
      }

      if (new URL(relayUrl).protocol !== 'https:') {
        throw new Error('Google Apps Script relay URL must use HTTPS');
      }

      const response = await fetch(relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: relayToken,
          to,
          subject,
          text,
          html,
        }),
      });

      const responseBody = await response.text();
      if (!response.ok) {
        throw new Error(
          `Google Apps Script returned ${response.status}: ${responseBody}`,
        );
      }

      let result: unknown;
      try {
        result = JSON.parse(responseBody);
      } catch {
        throw new Error('Google Apps Script returned an invalid response');
      }

      if (typeof result !== 'object' || result === null || !('ok' in result)) {
        throw new Error('Google Apps Script returned an invalid response');
      }
      if (result.ok !== true) {
        const details =
          'error' in result && typeof result.error === 'string'
            ? result.error
            : 'Unknown email relay error';
        throw new Error(`Google Apps Script failed: ${details}`);
      }
      return;
    }

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      throw new Error(
        'Configure RESEND_API_KEY and FROM_EMAIL, or SMTP_USER and SMTP_PASS',
      );
    }

    await nodemailer
      .createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: { user, pass },
      })
      .sendMail({
        from: process.env.FROM_EMAIL || 'noreply@lumina-library.com',
        to,
        subject,
        text,
        html,
      });
  }

  private async removeRejectedUserIfExists(email: string, institutionalId: string): Promise<void> {
    const existingByEmail = await this.userRepo.findOne({ where: { email } });
    if (existingByEmail?.accountApprovalStatus === AccountApprovalStatus.REJECTED) {
      await this.userRepo.remove(existingByEmail);
    }

    const existingById = await this.userRepo.findOne({ where: { institutionalId } });
    if (existingById?.accountApprovalStatus === AccountApprovalStatus.REJECTED) {
      await this.userRepo.remove(existingById);
    }
  }

  async create(dto: CreateUserDto, ipAddress?: string, userAgent?: string): Promise<User> {
    await this.removeRejectedUserIfExists(dto.email, dto.institutionalId);

    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists)
      throw new ConflictException(`Email ${dto.email} already registered`);

    const idExists = await this.userRepo.findOne({
      where: { institutionalId: dto.institutionalId },
    });
    if (idExists)
      throw new ConflictException(
        `Institutional ID ${dto.institutionalId} already registered`,
      );

    let department: Department | null = null;
    if (roleUsesDepartment(dto.role) && dto.departmentId) {
      const dept = await this.deptRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (dept) department = dept;
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const barcode = this.generateBarcodeFromInstitutionalId(dto.institutionalId);

    const partial: Partial<User> = {
      institutionalId: dto.institutionalId,
      barcode,
      email: dto.email,
      passwordHash: hash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      gender: dto.gender,
      role: dto.role,
      department,
      yearLevel: dto.yearLevel,
      section: dto.section,
      accountApprovalStatus: AccountApprovalStatus.APPROVED,
      mustChangePassword: dto.role === UserRole.STUDENT,
    };

    const user = this.userRepo.create(partial as any);
    const savedUser = (await this.userRepo.save(user as any)) as User;

    // Log activity
    await this.activityLogService.logCreate(
      null, // system created
      ActivityResource.USER,
      savedUser.id,
      { email: savedUser.email, role: savedUser.role },
      ipAddress,
      userAgent,
    );

    return savedUser;
  }

  /**
   * Generate barcode from institutional ID (pure ID, no prefix)
   * The institutional ID is already unique, so use it directly
   */
  private generateBarcodeFromInstitutionalId(institutionalId: string): string {
    return institutionalId.toUpperCase();
  }

  /** Public self-registration: pending librarian approval, barcode assigned here. */
  async registerPublicPending(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    institutionalId: string;
    role: UserRole.STUDENT | UserRole.FACULTY | UserRole.LIBRARIAN | UserRole.NON_TEACHING_STAFF;
    gender?: any;
    departmentId?: number;
    profilePhotoUrl?: string;
  }, ipAddress?: string, userAgent?: string): Promise<User> {
    await this.removeRejectedUserIfExists(dto.email, dto.institutionalId);

    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists)
      throw new ConflictException(`Email ${dto.email} already registered`);

    const idExists = await this.userRepo.findOne({
      where: { institutionalId: dto.institutionalId },
    });
    if (idExists)
      throw new ConflictException(
        `Institutional ID ${dto.institutionalId} already registered`,
      );

    let department: Department | null = null;
    if (roleUsesDepartment(dto.role) && dto.departmentId) {
      const dept = await this.deptRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (dept) department = dept;
    }

    const barcode = this.generateBarcodeFromInstitutionalId(dto.institutionalId);
    const hash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      institutionalId: dto.institutionalId,
      barcode,
      email: dto.email,
      passwordHash: hash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      gender: dto.gender,
      department,
      profilePhotoUrl: dto.profilePhotoUrl,
      accountApprovalStatus: AccountApprovalStatus.PENDING,
      isActive: true,
    } as any);

    const savedUser = (await this.userRepo.save(user as any)) as User;

    // Log activity
    await this.activityLogService.logCreate(
      savedUser.id,
      ActivityResource.USER,
      savedUser.id,
      { email: savedUser.email, role: savedUser.role, status: 'pending' },
      ipAddress,
      userAgent,
    );

    return savedUser;
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.email = :email', { email })
      .getOne();
    if (!user) throw new NotFoundException(`No account with email ${email}`);
    return user;
  }

  async findByBarcode(barcode: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { barcode },
      relations: ['department'],
    });
    if (!user)
      throw new NotFoundException(`No user found with barcode "${barcode}"`);
    return user;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async getProfile(id: number): Promise<User> {
    return this.findById(id);
  }

  async getDepartments(): Promise<Department[]> {
    return this.deptRepo.find({ order: { name: 'ASC' } });
  }

  async findAll(
    search?: string,
    role?: string,
    page: number = 1,
    limit: number = 10,
    approvalStatus?: string,
    isActive?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department');

    if (sortBy === 'name') {
      qb.orderBy('user.firstName', sortOrder).addOrderBy(
        'user.lastName',
        sortOrder,
      );
    } else if (sortBy === 'department') {
      qb.orderBy('department.name', sortOrder);
    } else {
      qb.orderBy('user.createdAt', sortOrder);
    }

    if (role) qb.andWhere('user.role = :role', { role });
    if (approvalStatus)
      qb.andWhere('user.accountApprovalStatus = :approvalStatus', {
        approvalStatus,
      });
    if (isActive !== undefined && isActive !== '') {
      qb.andWhere('user.isActive = :isActive', { isActive: isActive === 'true' });
    }
    if (search) {
      qb.andWhere(
        '(user.firstName LIKE :s OR user.lastName LIKE :s OR user.email LIKE :s OR user.institutionalId LIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [users, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      total,
      page,
      lastPage: Math.ceil(total / limit) || 1,
    };
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    requesterRole?: UserRole,
    requesterId: number | null = null,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const user = await this.findById(id);
    const previousStatus = user.accountApprovalStatus;
    const previousRole = user.role;
    const previousIsActive = user.isActive;

    if (dto.role !== undefined) user.role = dto.role;

    if (roleUsesDepartment(user.role)) {
      if (dto.departmentId !== undefined) {
        const dept = await this.deptRepo.findOne({
          where: { id: dto.departmentId },
        });
        if (dept) user.department = dept;
      }
    } else {
      user.department = null;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.yearLevel !== undefined) user.yearLevel = dto.yearLevel;
    if (dto.section !== undefined) user.section = dto.section;
    if (dto.eligibilityStatus !== undefined)
      user.eligibilityStatus = dto.eligibilityStatus;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    let approvalAction: 'approve' | 'reject' | null = null;
    if (
      dto.accountApprovalStatus !== undefined &&
      dto.accountApprovalStatus !== user.accountApprovalStatus
    ) {
      if (user.role === UserRole.LIBRARIAN) {
        if (
          requesterRole !== UserRole.ADMIN &&
          requesterRole !== UserRole.CHIEF_LIBRARIAN
        ) {
          throw new ForbiddenException(
            'Only an admin or chief librarian can approve or update a librarian account status.',
          );
        }
      }

      user.accountApprovalStatus = dto.accountApprovalStatus;

      if (previousStatus === AccountApprovalStatus.PENDING) {
        if (dto.accountApprovalStatus === AccountApprovalStatus.APPROVED) {
          approvalAction = 'approve';
          const text = `Hello ${user.firstName},\n\nYour registration has been approved.\nYour Library ID is: ${user.barcode}.\n\nYou can now log in and print your ID card from your profile.\n\nThank you,\nLumina Library Team`;
          const html = `<p>Hello ${user.firstName},</p><p>Your registration has been <strong>approved</strong>.</p><p>Your Library ID is: <strong>${user.barcode}</strong>.</p><p>You can now log in and print your ID card from your profile.</p><p>Thank you,<br/>Lumina Library Team</p>`;

          void this.sendEmail(
            user.email,
            'Lumina Registration Approved',
            text,
            html,
          ).catch((err) =>
            console.error('Failed to send approval email:', err),
          );
        } else if (
          dto.accountApprovalStatus === AccountApprovalStatus.REJECTED
        ) {
          approvalAction = 'reject';
          const reason = dto.rejectionReason || 'No specific reason provided.';
          const text = `Hello ${user.firstName},\n\nUnfortunately, your registration was rejected.\n\nReason: ${reason}\n\nPlease contact the library administration for more details.\n\nThank you,\nLumina Library Team`;
          const html = `<p>Hello ${user.firstName},</p><p>Unfortunately, your registration was <strong>rejected</strong>.</p><p><strong>Reason:</strong> ${reason}</p><p>Please contact the library administration for more details.</p><p>Thank you,<br/>Lumina Library Team</p>`;

          void this.sendEmail(
            user.email,
            'Lumina Registration Rejected',
            text,
            html,
          ).catch((err) =>
            console.error('Failed to send rejection email:', err),
          );
        }
      }
    }

    const savedUser = await this.userRepo.save(user);

    // Log activity based on what changed
    const changes: Record<string, any> = {};
    if (previousRole !== savedUser.role) changes.role = { from: previousRole, to: savedUser.role };
    if (previousIsActive !== savedUser.isActive) changes.isActive = { from: previousIsActive, to: savedUser.isActive };
    if (previousStatus !== savedUser.accountApprovalStatus) {
      changes.accountApprovalStatus = { from: previousStatus, to: savedUser.accountApprovalStatus };
    }
    if (dto.firstName !== undefined && dto.firstName !== savedUser.firstName) changes.firstName = dto.firstName;
    if (dto.lastName !== undefined && dto.lastName !== savedUser.lastName) changes.lastName = dto.lastName;
    if (dto.email !== undefined && dto.email !== savedUser.email) changes.email = dto.email;
    if (dto.yearLevel !== undefined && dto.yearLevel !== savedUser.yearLevel) changes.yearLevel = dto.yearLevel;
    if (dto.section !== undefined && dto.section !== savedUser.section) changes.section = dto.section;
    if (dto.eligibilityStatus !== undefined && dto.eligibilityStatus !== savedUser.eligibilityStatus) changes.eligibilityStatus = dto.eligibilityStatus;

    if (approvalAction === 'approve') {
      await this.activityLogService.logApprove(
        requesterId,
        ActivityResource.USER,
        savedUser.id,
        { ...changes, rejectionReason: dto.rejectionReason },
        ipAddress,
        userAgent,
      );
    } else if (approvalAction === 'reject') {
      await this.activityLogService.logReject(
        requesterId,
        ActivityResource.USER,
        savedUser.id,
        { ...changes, rejectionReason: dto.rejectionReason },
        ipAddress,
        userAgent,
      );
    } else if (Object.keys(changes).length > 0) {
      await this.activityLogService.logUpdate(
        requesterId,
        ActivityResource.USER,
        savedUser.id,
        changes,
        ipAddress,
        userAgent,
      );
    }

    return savedUser;
  }

  async updateProfile(id: number, dto: UpdateProfileDto, ipAddress?: string, userAgent?: string): Promise<User> {
    const user = await this.findById(id);

    const changes: Record<string, any> = {};
    if (dto.firstName !== undefined && dto.firstName !== user.firstName) {
      changes.firstName = { from: user.firstName, to: dto.firstName };
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined && dto.lastName !== user.lastName) {
      changes.lastName = { from: user.lastName, to: dto.lastName };
      user.lastName = dto.lastName;
    }
    if (dto.middleName !== undefined && dto.middleName !== user.middleName) {
      changes.middleName = { from: user.middleName, to: dto.middleName };
      user.middleName = dto.middleName;
    }
    if (dto.gender !== undefined && dto.gender !== user.gender) {
      changes.gender = { from: user.gender, to: dto.gender };
      user.gender = dto.gender;
    }
    if (dto.profilePhotoUrl !== undefined && dto.profilePhotoUrl !== user.profilePhotoUrl) {
      changes.profilePhotoUrl = { from: user.profilePhotoUrl ? 'updated' : 'added', to: 'updated' };
      user.profilePhotoUrl = dto.profilePhotoUrl;
    }

    const savedUser = await this.userRepo.save(user);

    if (Object.keys(changes).length > 0) {
      await this.activityLogService.logUpdateProfile(
        id,
        changes,
        ipAddress,
        userAgent,
      );
    }

    return savedUser;
  }

  async changePassword(id: number, dto: ChangePasswordDto, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException(`User #${id} not found`);

    const isMatch = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new ConflictException('Incorrect current password');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    await this.userRepo.save(user);

    await this.activityLogService.logChangePassword(id, ipAddress, userAgent);
  }

  async remove(id: number, requesterId: number | null = null, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.findById(id);
    const userEmail = user.email;
    // Soft-delete: just deactivate the account
    user.isActive = false;
    await this.userRepo.save(user);

    await this.activityLogService.logDelete(
      requesterId,
      ActivityResource.USER,
      id,
      { email: userEmail },
      ipAddress,
      userAgent,
    );
  }

  // ─── Password Reset ────────────────────────────────────────────────────────────
  async requestPasswordReset(email: string): Promise<void> {
    // Use case-insensitive email lookup
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim().toLowerCase() })
      .getOne();

    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiry

    user.passwordResetToken = token;
    user.passwordResetExpires = expires;
    await this.userRepo.save(user);

    // Send reset email using the user's actual email (preserves original case)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    const text = `Hello ${user.firstName},\n\nYou requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nThank you,\nLumina Library Team`;
    const html = `<p>Hello ${user.firstName},</p><p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p><p>If you didn't request this, please ignore this email.</p><p>Thank you,<br/>Lumina Library Team</p>`;

    await this.sendEmail(user.email, 'Lumina Password Reset', text, html).catch((err) =>
      console.error('Failed to send password reset email:', err),
    );
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<void> {
    // Use case-insensitive email lookup (MySQL collation may be case-sensitive)
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.passwordResetToken')
      .addSelect('user.passwordResetExpires')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim().toLowerCase() })
      .getOne();

    if (!user) {
      throw new ConflictException('Invalid reset token');
    }

    // Trim token in case of whitespace issues
    const providedToken = token.trim();
    const storedToken = user.passwordResetToken?.trim();

    if (!storedToken || storedToken !== providedToken) {
      throw new ConflictException('Invalid reset token');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new ConflictException('Reset token has expired');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.mustChangePassword = false;
    await this.userRepo.save(user);

    await this.activityLogService.logChangePassword(user.id);
  }
}
