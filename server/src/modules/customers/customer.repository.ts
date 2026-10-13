import { CustomerModel, ICustomerDocument } from './customer.model.js';
import { normalizeBranchKey } from '../../shared/index.js';
import mongoose from 'mongoose';

function buildCustomerBranchFilter(branch?: string): any {
  if (!branch) return undefined;
  const b = branch.toLowerCase().trim();
  if (b === 'dombivli' || b === 'dombivali') {
    return { $in: ['dombivli', 'dombivali'] };
  }
  if (b === 'kalyan_east' || b === 'kalyaneast' || b === 'kolsewadi') {
    return { $in: ['kalyan_east', 'kalyaneast', 'kolsewadi'] };
  }
  if (b === 'kalyan' || b === 'kalyanwest') {
    return { $in: ['kalyan', 'kalyanwest'] };
  }
  return b;
}

export class CustomerRepository {
  async findById(id: string, organizationId: string): Promise<ICustomerDocument | null> {
    return CustomerModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });
  }

  async findByPhone(phone: string, organizationId: string, branch?: string): Promise<ICustomerDocument | null> {
    const filter: Record<string, unknown> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      phone,
    };
    const bFilter = buildCustomerBranchFilter(branch);
    if (bFilter) {
      filter.branch = bFilter;
    }
    return CustomerModel.findOne(filter);
  }

  async create(data: {
    organizationId: string;
    name: string;
    jewellerName?: string;
    phone: string;
    rawPhone: string;
    branch?: string;
    notes?: string;
  }): Promise<ICustomerDocument> {
    const branch = normalizeBranchKey(data.branch);
    return CustomerModel.create({
      ...data,
      organizationId: new mongoose.Types.ObjectId(data.organizationId),
      branch,
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: Partial<{ name: string; jewellerName: string; phone: string; rawPhone: string; branch: string; notes: string }>
  ): Promise<ICustomerDocument | null> {
    return CustomerModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
      { $set: data },
      { new: true }
    );
  }

  async search(
    organizationId: string,
    query: string,
    limit: number = 20,
    branch?: string
  ): Promise<ICustomerDocument[]> {
    const orgId = new mongoose.Types.ObjectId(organizationId);
    const trimmed = query.trim();

    const filter: Record<string, unknown> = {
      organizationId: orgId,
      $or: [
        { name: { $regex: trimmed, $options: 'i' } },
        { phone: { $regex: trimmed, $options: 'i' } },
        { rawPhone: { $regex: trimmed, $options: 'i' } },
      ],
    };

    const bFilter = buildCustomerBranchFilter(branch);
    if (bFilter) {
      filter.branch = bFilter;
    }

    return CustomerModel.find(filter).sort({ createdAt: -1 }).limit(limit);
  }

  async list(organizationId: string, limit: number = 50, skip: number = 0, branch?: string): Promise<ICustomerDocument[]> {
    const filter: Record<string, unknown> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };
    const bFilter = buildCustomerBranchFilter(branch);
    if (bFilter) {
      filter.branch = bFilter;
    }
    return CustomerModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}
