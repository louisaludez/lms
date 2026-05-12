import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
      role: dto.role,
      department,
      yearLevel: dto.yearLevel,
      section: dto.section,
    };

    const user = this.userRepo.create(partial as any);
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

  async findAll(search?: string, role?: string): Promise<User[]> {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .orderBy('user.createdAt', 'DESC');

    if (role) qb.andWhere('user.role = :role', { role });
    if (search) {
      qb.andWhere(
        '(user.firstName LIKE :s OR user.lastName LIKE :s OR user.email LIKE :s OR user.institutionalId LIKE :s)',
        { s: `%${search}%` },
      );
    }
    return qb.getMany();
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
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

    return this.userRepo.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    // Soft-delete: just deactivate the account
    user.isActive = false;
    await this.userRepo.save(user);
  }
}
