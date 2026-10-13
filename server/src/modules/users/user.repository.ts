import { UserModel, IUserDocument } from './user.model.js';
import mongoose from 'mongoose';
import { Role, UserStatus } from '../../types/index.js';

export class UserRepository {
  async findById(id: string, organizationId?: string): Promise<IUserDocument | null> {
    const filter: Record<string, unknown> = { _id: new mongoose.Types.ObjectId(id) };
    if (organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }
    return UserModel.findOne(filter);
  }

  async findByEmail(email: string, organizationId?: string): Promise<IUserDocument | null> {
    const filter: Record<string, unknown> = { email: email.toLowerCase() };
    if (organizationId) {
      filter.organizationId = new mongoose.Types.ObjectId(organizationId);
    }
    return UserModel.findOne(filter);
  }

  async create(data: {
    organizationId: string | mongoose.Types.ObjectId;
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    branch?: string;
    status?: UserStatus;
  }): Promise<IUserDocument> {
    return UserModel.create({
      ...data,
      organizationId: new mongoose.Types.ObjectId(String(data.organizationId)),
      email: data.email.toLowerCase(),
      branch: (data.branch || 'kalyan').toLowerCase().trim(),
    });
  }

  async listByOrganization(organizationId: string): Promise<IUserDocument[]> {
    return UserModel.find({ organizationId: new mongoose.Types.ObjectId(organizationId) }).sort({ createdAt: -1 });
  }
}
