import { OrganizationRepository } from './organization.repository.js';
import { OrganizationDTO } from '../../types/index.js';
import { NotFoundError } from '../../middleware/error.middleware.js';

export class OrganizationService {
  constructor(private orgRepo: OrganizationRepository = new OrganizationRepository()) {}

  async getById(id: string): Promise<OrganizationDTO> {
    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new NotFoundError(`Organization ${id} not found`);
    }
    return {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      code: org.code,
      status: org.status,
      settings: org.settings,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async getBySlug(slug: string): Promise<OrganizationDTO | null> {
    const org = await this.orgRepo.findBySlug(slug);
    if (!org) return null;
    return {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      code: org.code,
      status: org.status,
      settings: org.settings,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async createOrganization(data: {
    name: string;
    slug: string;
    code?: string;
  }): Promise<OrganizationDTO> {
    const org = await this.orgRepo.create(data);
    return {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      code: org.code,
      status: org.status,
      settings: org.settings,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }
}
