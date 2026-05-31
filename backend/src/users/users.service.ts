import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserRole,
  AccountApprovalStatus,
} from './entities/user.entity';
import { Department } from './entities/department.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Like } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
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

    let department: Department | undefined = undefined;
    if (dto.departmentId) {
      const dept = await this.deptRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (dept) department = dept;
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const partial: Partial<User> = {
      institutionalId: dto.institutionalId,
      barcode: dto.barcode,
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
    };

    const user = this.userRepo.create(partial as any);
    return (await this.userRepo.save(user as any)) as User;
  }

  private async generateUniqueLibraryBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 25; attempt++) {
      const raw = randomBytes(9)
        .toString('base64url')
        .replace(/[^a-zA-Z0-9]/g, '');
      const candidate = `LUM-${raw}`.slice(0, 60);
      const taken = await this.userRepo.exist({ where: { barcode: candidate } });
      if (!taken) return candidate;
    }
    throw new InternalServerErrorException(
      'Could not generate a unique library barcode',
    );
  }

  /** Public self-registration: pending librarian approval, barcode assigned here. */
  async registerPublicPending(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    institutionalId: string;
    role: UserRole.STUDENT | UserRole.FACULTY | UserRole.LIBRARIAN;
    gender?: any;
    departmentId?: number;
    profilePhotoUrl?: string;
  }): Promise<User> {
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

    let department: Department | undefined = undefined;
    if (dto.departmentId) {
      const dept = await this.deptRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (dept) department = dept;
    }

    const barcode = await this.generateUniqueLibraryBarcode();
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

    return (await this.userRepo.save(user as any)) as User;
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
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .orderBy('user.createdAt', 'DESC');

    if (role) qb.andWhere('user.role = :role', { role });
    if (approvalStatus)
      qb.andWhere('user.accountApprovalStatus = :approvalStatus', {
        approvalStatus,
      });
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

    return { data: users, total, page, lastPage: Math.ceil(total / limit) || 1 };
  }

  async update(id: number, dto: UpdateUserDto, requesterRole?: UserRole): Promise<User> {
    const user = await this.findById(id);

    if (dto.departmentId !== undefined) {
      const dept = await this.deptRepo.findOne({ where: { id: dto.departmentId } });
      if (dept) user.department = dept;
    }

    if (dto.firstName !== undefined)        user.firstName        = dto.firstName;
    if (dto.lastName !== undefined)         user.lastName         = dto.lastName;
    if (dto.middleName !== undefined)       user.middleName       = dto.middleName;
    if (dto.email !== undefined)            user.email            = dto.email;
    if (dto.role !== undefined)             user.role             = dto.role;
    if (dto.yearLevel !== undefined)        user.yearLevel        = dto.yearLevel;
    if (dto.section !== undefined)          user.section          = dto.section;
    if (dto.eligibilityStatus !== undefined) user.eligibilityStatus = dto.eligibilityStatus;
    if (dto.isActive !== undefined)         user.isActive         = dto.isActive;
    
    if (dto.accountApprovalStatus !== undefined && dto.accountApprovalStatus !== user.accountApprovalStatus) {
      if (user.role === UserRole.LIBRARIAN) {
        if (requesterRole !== UserRole.ADMIN && requesterRole !== UserRole.CHIEF_LIBRARIAN) {
          throw new ForbiddenException('Only an admin or chief librarian can approve or update a librarian account status.');
        }
      }
      user.accountApprovalStatus = dto.accountApprovalStatus;
    }

    return this.userRepo.save(user);
  }

  async updateProfile(id: number, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.profilePhotoUrl !== undefined) user.profilePhotoUrl = dto.profilePhotoUrl;

    return this.userRepo.save(user);
  }

  async changePassword(id: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException(`User #${id} not found`);

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new ConflictException('Incorrect current password');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    // Soft-delete: just deactivate the account
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
