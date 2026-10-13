import bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository.js';
import { Role, UserDTO } from '../../types/index.js';
import { ConflictError, NotFoundError } from '../../middleware/error.middleware.js';

export class UserService {
  constructor(private userRepo: UserRepository = new UserRepository()) {}

  async createUser(data: {
    organizationId: string;
    name: string;
    email: string;
    password: string;
    role: Role;
  }): Promise<UserDTO> {
    const existing = await this.userRepo.findByEmail(data.email, data.organizationId);
    if (existing) {
      throw new ConflictError(`User with email '${data.email}' already exists in this organization`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await this.userRepo.create({
      organizationId: data.organizationId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      branch: (data as any).branch || 'kalyan',
    });

    return {
      id: String(user._id),
      organizationId: String(user.organizationId),
      name: user.name,
      email: user.email,
      role: user.role,
      branch: (user as any).branch || 'kalyan',
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getById(id: string, organizationId: string): Promise<UserDTO> {
    const user = await this.userRepo.findById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const isOrgAdmin = user.role === 'ORGANIZATION_ADMIN' || user.role === 'SUPER_ADMIN' || user.email === 'admin@goldscope.io';
    const name = isOrgAdmin ? (user.name || 'Admin') : user.name;
    const branch = isOrgAdmin ? 'all' : ((user as any).branch || 'kalyan');

    return {
      id: String(user._id),
      organizationId: String(user.organizationId),
      name,
      email: user.email,
      role: user.role,
      branch,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
