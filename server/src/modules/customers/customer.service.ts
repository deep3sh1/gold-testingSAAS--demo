import { CustomerRepository } from './customer.repository.js';
import { AuditService } from '../audit/audit.service.js';
import { CustomerDTO } from '../../types/index.js';
import { normalizeIndianPhone } from '../../shared/index.js';
import { BadRequestError, NotFoundError } from '../../middleware/error.middleware.js';

export class CustomerService {
  constructor(
    private customerRepo: CustomerRepository = new CustomerRepository(),
    private auditService: AuditService = new AuditService()
  ) {}

  async getOrCreateCustomer(
    organizationId: string,
    data: { name: string; phone: string; jewellerName?: string; rawPhone?: string; branch?: string; notes?: string },
    actorUserId?: string
  ): Promise<CustomerDTO> {
    const norm = normalizeIndianPhone(data.phone);
    if (!norm.isValid) {
      throw new BadRequestError(norm.error || 'Invalid Indian phone number');
    }

    const canonicalPhone = norm.canonical;
    const branch = (data.branch || 'kalyan').toLowerCase().trim();
    let existing = await this.customerRepo.findByPhone(canonicalPhone, organizationId, branch);

    if (existing) {
      // Update name or jewellerName if provided
      const updates: any = {};
      if (data.name && data.name !== existing.name) updates.name = data.name;
      if (data.jewellerName !== undefined && data.jewellerName !== (existing as any).jewellerName) updates.jewellerName = data.jewellerName;
      if (data.notes) updates.notes = data.notes;

      if (Object.keys(updates).length > 0) {
        existing = await this.customerRepo.update(String(existing._id), organizationId, updates);

        if (existing) {
          await this.auditService.log({
            organizationId,
            actorUserId,
            action: 'CUSTOMER_UPDATED',
            entityType: 'CUSTOMER',
            entityId: String(existing._id),
            metadata: { name: data.name, phone: canonicalPhone, branch },
          });
        }
      }

      if (!existing) {
        throw new NotFoundError('Customer record missing');
      }

      return this.toDTO(existing);
    }

    // Create fresh customer
    const created = await this.customerRepo.create({
      organizationId,
      name: data.name,
      jewellerName: data.jewellerName || '',
      phone: canonicalPhone,
      rawPhone: data.rawPhone || data.phone,
      branch,
      notes: data.notes,
    });

    await this.auditService.log({
      organizationId,
      actorUserId,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: String(created._id),
      metadata: { name: data.name, phone: canonicalPhone, branch },
    });

    return this.toDTO(created);
  }

  async searchCustomers(organizationId: string, query: string, branch?: string): Promise<CustomerDTO[]> {
    if (!query || query.trim().length === 0) {
      const list = await this.customerRepo.list(organizationId, 20, 0, branch);
      return list.map((c) => this.toDTO(c));
    }

    const results = await this.customerRepo.search(organizationId, query, 20, branch);
    return results.map((c) => this.toDTO(c));
  }

  async getById(id: string, organizationId: string): Promise<CustomerDTO> {
    const cust = await this.customerRepo.findById(id, organizationId);
    if (!cust) {
      throw new NotFoundError('Customer not found');
    }
    return this.toDTO(cust);
  }

  async listCustomers(organizationId: string, limit: number = 50, skip: number = 0, branch?: string): Promise<CustomerDTO[]> {
    const list = await this.customerRepo.list(organizationId, limit, skip, branch);
    return list.map((c) => this.toDTO(c));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDTO(c: any): CustomerDTO {
    return {
      id: String(c._id),
      organizationId: String(c.organizationId),
      name: c.name,
      jewellerName: c.jewellerName || '',
      phone: c.phone,
      rawPhone: c.rawPhone || c.phone,
      branch: c.branch || 'kalyan',
      notes: c.notes,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
    };
  }
}
