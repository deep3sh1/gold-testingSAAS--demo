import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../users/user.repository.js';
import { OrganizationRepository } from '../organizations/organization.repository.js';
import { config } from '../../config/index.js';
import { AuthSessionUser, UserDTO } from '../../types/index.js';
import { UnauthorizedError } from '../../middleware/error.middleware.js';

export class AuthService {
  constructor(
    private userRepo: UserRepository = new UserRepository(),
    private orgRepo: OrganizationRepository = new OrganizationRepository()
  ) {}

  async login(emailOrUsername: string, password: string): Promise<{ token: string; user: AuthSessionUser; userDto: UserDTO }> {
    const trimmedInput = (emailOrUsername || '').trim().toLowerCase();
    let userDoc = await this.userRepo.findByEmail(trimmedInput);
    if (!userDoc && !trimmedInput.includes('@')) {
      userDoc = await this.userRepo.findByEmail(`${trimmedInput}@goldscope.io`);
    }
    if (!userDoc && !trimmedInput.includes('@')) {
      const normalized = trimmedInput.replace(/[-_]/g, '');
      userDoc = await this.userRepo.findByEmail(`${normalized}@goldscope.io`);
    }
    if (!userDoc && !trimmedInput.includes('@')) {
      if (trimmedInput.includes('dombivli')) {
        const alt = trimmedInput.replace('dombivli', 'dombivali');
        userDoc = await this.userRepo.findByEmail(`${alt}@goldscope.io`);
      } else if (trimmedInput.includes('dombivali')) {
        const alt = trimmedInput.replace('dombivali', 'dombivli');
        userDoc = await this.userRepo.findByEmail(`${alt}@goldscope.io`);
      }
    }
    if (!userDoc || userDoc.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, userDoc.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const orgDoc = await this.orgRepo.findById(String(userDoc.organizationId));
    if (!orgDoc || orgDoc.status !== 'ACTIVE') {
      throw new UnauthorizedError('Organization account is inactive or suspended');
    }

    const isOrgAdmin = userDoc.role === 'ORGANIZATION_ADMIN' || userDoc.role === 'SUPER_ADMIN' || userDoc.email === 'admin@goldscope.io';
    const branch = isOrgAdmin ? 'all' : ((userDoc as any).branch || 'kalyan');
    const name = isOrgAdmin ? (userDoc.name || 'Admin') : userDoc.name;

    const sessionUser: AuthSessionUser = {
      userId: String(userDoc._id),
      organizationId: String(userDoc.organizationId),
      email: userDoc.email,
      name,
      role: userDoc.role,
      branch,
      orgCode: orgDoc.code || 'GT',
    };

    const token = jwt.sign(sessionUser, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const userDto: UserDTO = {
      id: String(userDoc._id),
      organizationId: String(userDoc.organizationId),
      name,
      email: userDoc.email,
      role: userDoc.role,
      branch,
      status: userDoc.status,
      createdAt: userDoc.createdAt.toISOString(),
      updatedAt: userDoc.updatedAt.toISOString(),
    };

    return { token, user: sessionUser, userDto };
  }

  async verifyToken(token: string): Promise<AuthSessionUser> {
    try {
      return jwt.verify(token, config.jwtSecret) as AuthSessionUser;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
