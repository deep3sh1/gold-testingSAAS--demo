import { OrganizationModel, IOrganizationDocument } from './organization.model.js';

export class OrganizationRepository {
  async findById(id: string): Promise<IOrganizationDocument | null> {
    return OrganizationModel.findById(id);
  }

  async findBySlug(slug: string): Promise<IOrganizationDocument | null> {
    return OrganizationModel.findOne({ slug: slug.toLowerCase() });
  }

  async create(data: {
    name: string;
    slug: string;
    code?: string;
    settings?: {
      timezone?: string;
      tokenPrefix?: string;
      defaultWeightUnit?: string;
      defaultTesterValueUnit?: string;
    };
  }): Promise<IOrganizationDocument> {
    return OrganizationModel.create({
      name: data.name,
      slug: data.slug.toLowerCase(),
      code: (data.code || 'GN').toUpperCase(),
      settings: {
        timezone: data.settings?.timezone || 'Asia/Kolkata',
        tokenPrefix: data.settings?.tokenPrefix || data.code || 'GN',
        defaultWeightUnit: data.settings?.defaultWeightUnit || 'g',
        defaultTesterValueUnit: data.settings?.defaultTesterValueUnit || '',
      },
    });
  }

  async update(id: string, data: Partial<IOrganizationDocument>): Promise<IOrganizationDocument | null> {
    return OrganizationModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }
}
