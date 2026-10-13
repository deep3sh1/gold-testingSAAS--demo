import { describe, it, expect, beforeEach } from 'vitest';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { CustomerService } from '../src/modules/customers/customer.service.js';
import { DailyTokenService } from '../src/modules/daily-tokens/daily-token.service.js';
import { TestRequestService } from '../src/modules/test-requests/test-request.service.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { WhatsAppService } from '../src/modules/whatsapp/whatsapp.service.js';
import { IWhatsAppProvider } from '../src/modules/whatsapp/whatsapp.types.js';
import { getIndianBusinessDate, normalizeIndianPhone } from '../src/shared/index.js';

describe('GOLDSCOPE ASSAY SaaS — MVP Test Suite', () => {
  let orgId1: string;
  let orgId2: string;
  let receptionist1Id: string;
  let tester1Id: string;
  let tester2Id: string;

  let customerService: CustomerService;
  let dailyTokenService: DailyTokenService;
  let testRequestService: TestRequestService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    // Setup 2 distinct Tenant Organizations
    const org1 = await OrganizationModel.create({
      name: 'Apex Gold Assay',
      slug: 'apex-gold',
      code: 'GT',
      settings: { timezone: 'Asia/Kolkata', tokenPrefix: 'GT' },
    });
    orgId1 = String(org1._id);

    const org2 = await OrganizationModel.create({
      name: 'Kalyan Bullion Lab',
      slug: 'kalyan-bullion',
      code: 'KB',
      settings: { timezone: 'Asia/Kolkata', tokenPrefix: 'KB' },
    });
    orgId2 = String(org2._id);

    // Setup Users
    const rec1 = await UserModel.create({
      organizationId: orgId1,
      name: 'Priya Sharma',
      email: 'reception@apex.com',
      passwordHash: 'hashed',
      role: 'RECEPTIONIST',
    });
    receptionist1Id = String(rec1._id);

    const t1 = await UserModel.create({
      organizationId: orgId1,
      name: 'Rahul Verma',
      email: 'rahul@apex.com',
      passwordHash: 'hashed',
      role: 'TESTER',
    });
    tester1Id = String(t1._id);

    const t2 = await UserModel.create({
      organizationId: orgId1,
      name: 'Amit Patel',
      email: 'amit@apex.com',
      passwordHash: 'hashed',
      role: 'TESTER',
    });
    tester2Id = String(t2._id);

    customerService = new CustomerService();
    dailyTokenService = new DailyTokenService();
    notificationService = new NotificationService();
    testRequestService = new TestRequestService();
    testRequestService.setNotificationService(notificationService);
  });

  // 1. Phone Normalization & Validation
  it('1. should canonically normalize various Indian phone number formats', () => {
    expect(normalizeIndianPhone('9876543210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhone('+91 98765 43210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhone('09876543210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhone('919876543210').canonical).toBe('+919876543210');
    expect(normalizeIndianPhone('12345').isValid).toBe(false);
  });

  // 2. New customer creation & existing search
  it('2. should create persistent customer and allow search without duplication', async () => {
    const cust1 = await customerService.getOrCreateCustomer(orgId1, {
      name: 'ABC Jewellers',
      phone: '9876543210',
    });

    expect(cust1.id).toBeDefined();
    expect(cust1.phone).toBe('+919876543210');

    // Searching for same phone returns existing customer
    const cust2 = await customerService.getOrCreateCustomer(orgId1, {
      name: 'ABC Jewellers Zaveri',
      phone: '+91 98765 43210',
    });

    expect(cust2.id).toBe(cust1.id);
    expect(cust2.name).toBe('ABC Jewellers Zaveri');

    const searchRes = await customerService.searchCustomers(orgId1, 'ABC');
    expect(searchRes.length).toBe(1);
    expect(searchRes[0].id).toBe(cust1.id);
  });

  // 3. Indian Business Date derivation
  it('3. should strictly derive Indian Business Date using Asia/Kolkata', () => {
    const indianDate = getIndianBusinessDate();
    expect(indianDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // 4. Daily token generation sequence
  it('4. should generate sequential tokens prefixed by organization code', async () => {
    const t1 = await dailyTokenService.generateToken(orgId1, 'GT');
    const t2 = await dailyTokenService.generateToken(orgId1, 'GT');
    const t3 = await dailyTokenService.generateToken(orgId1, 'GT');

    const todayClean = getIndianBusinessDate().replace(/-/g, '');
    expect(t1.tokenNumber).toBe(`GT-${todayClean}-001`);
    expect(t2.tokenNumber).toBe(`GT-${todayClean}-002`);
    expect(t3.tokenNumber).toBe(`GT-${todayClean}-003`);
  });

  // 5. Concurrency: Two simultaneous reception requests never create duplicate tokens
  it('5. CONCURRENCY: Simultaneous token requests must never generate duplicate tokens', async () => {
    const promises = Array.from({ length: 30 }, () =>
      dailyTokenService.generateToken(orgId1, 'GT')
    );

    const results = await Promise.all(promises);
    const tokens = results.map((r) => r.tokenNumber);
    const uniqueTokens = new Set(tokens);

    expect(uniqueTokens.size).toBe(30);
  });

  // 6. Token reset on next Indian business date
  it('6. should reset sequence to 001 on a new business date', async () => {
    const day1 = new Date('2026-09-09T10:00:00Z');
    const day2 = new Date('2026-09-10T10:00:00Z');

    const tDay1 = await dailyTokenService.generateToken(orgId1, 'GT', day1);
    const tDay2 = await dailyTokenService.generateToken(orgId1, 'GT', day2);

    expect(tDay1.tokenNumber).toBe('GT-20260909-001');
    expect(tDay2.tokenNumber).toBe('GT-20260910-001');
  });

  // 7. Full Reception Request Creation Flow
  it('7. should create test request with automatic date, token, and WAITING status', async () => {
    const req = await testRequestService.createTestRequest(
      orgId1,
      receptionist1Id,
      'Priya Sharma',
      {
        customerName: 'Shree Ganesh Ornaments',
        phone: '9820012345',
        item: 'Gold Bangle (22K)',
        weight: 18.75,
        weightUnit: 'g',
      }
    );

    expect(req.id).toBeDefined();
    expect(req.tokenNumber).toContain('GT-');
    expect(req.status).toBe('WAITING');
    expect(req.customerNameSnapshot).toBe('Shree Ganesh Ornaments');
    expect(req.phoneSnapshot).toBe('+919820012345');
    expect(req.weight).toBe(18.75);
    expect(req.weightUnit).toBe('g');
  });

  // 8. Tester Search & Filter
  it('8. should allow tester to search by token, customer name, phone, or item', async () => {
    const req = await testRequestService.createTestRequest(
      orgId1,
      receptionist1Id,
      'Priya Sharma',
      {
        customerName: 'Unique Diamond & Gold',
        phone: '9811223344',
        item: 'Platinum Ring with Gold Bezel',
        weight: 6.42,
      }
    );

    // Search by Token
    const resByToken = await testRequestService.queryRequests(orgId1, {
      search: req.tokenNumber,
    });
    expect(resByToken.items.length).toBe(1);
    expect(resByToken.items[0].id).toBe(req.id);

    // Search by Customer
    const resByCust = await testRequestService.queryRequests(orgId1, {
      search: 'Unique Diamond',
    });
    expect(resByCust.items.length).toBe(1);

    // Search by Item
    const resByItem = await testRequestService.queryRequests(orgId1, {
      search: 'Platinum Ring',
    });
    expect(resByItem.items.length).toBe(1);
  });

  // 9. Concurrency: Two testers attempting to claim the exact same request
  it('9. CONCURRENCY: Two testers claiming same request -> Only ONE succeeds', async () => {
    const req = await testRequestService.createTestRequest(
      orgId1,
      receptionist1Id,
      'Priya Sharma',
      {
        customerName: 'Kaveri Jewellers',
        phone: '9844001122',
        item: 'Gold Necklace',
        weight: 42.15,
      }
    );

    const [claim1, claim2] = await Promise.allSettled([
      testRequestService.claimRequest(req.id, orgId1, tester1Id, 'Rahul Verma'),
      testRequestService.claimRequest(req.id, orgId1, tester2Id, 'Amit Patel'),
    ]);

    const successes = [claim1, claim2].filter((c) => c.status === 'fulfilled');
    const rejections = [claim1, claim2].filter((c) => c.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);

    // Check final request state
    const current = await testRequestService.getById(req.id, orgId1);
    expect(current.status).toBe('TESTING');
  });

  // 10. Tester enters numeric value & completion
  it('10. should store exact tester numeric value and transition to SENT', async () => {
    const req = await testRequestService.createTestRequest(
      orgId1,
      receptionist1Id,
      'Priya Sharma',
      {
        customerName: 'Radha Krishna Bullion',
        phone: '9877009988',
        item: 'Gold Bar 100g',
        weight: 100.0,
      }
    );

    await testRequestService.claimRequest(req.id, orgId1, tester1Id, 'Rahul Verma');

    const result = await testRequestService.submitTesterValueAndSend(
      req.id,
      orgId1,
      tester1Id,
      'Rahul Verma',
      {
        testerValue: 8.2,
      }
    );

    expect(result.testRequest.status).toBe('SENT');
    expect(result.testRequest.testerValue).toBe(8.2);
    expect(result.notificationStatus).toBe('SENT');
  });

  // 11. Multi-Tenant Isolation
  it('11. TENANT ISOLATION: Org A cannot view, claim, or search Org B requests', async () => {
    const reqOrg1 = await testRequestService.createTestRequest(
      orgId1,
      receptionist1Id,
      'Priya Sharma',
      {
        customerName: 'Tenant 1 Secret Customer',
        phone: '9819999999',
        item: 'Secret Gold Bar',
        weight: 50.0,
      }
    );

    // Org 2 query should return 0 items
    const org2Query = await testRequestService.queryRequests(orgId2, {
      search: 'Secret Gold Bar',
    });
    expect(org2Query.items.length).toBe(0);

    // Org 2 cannot claim Org 1 request
    await expect(
      testRequestService.claimRequest(reqOrg1.id, orgId2, 'some-other-user', 'Other Tester')
    ).rejects.toThrow();
  });

  // 12. WhatsApp Failure Resilience
  it('12. RESILIENCE: WhatsApp failure does NOT rollback test request state', async () => {
    // Inject failing WhatsApp provider
    const failingProvider: IWhatsAppProvider = {
      name: 'FAILING_PROVIDER',
      sendMessage: async () => ({
        success: false,
        error: 'Network timeout to WhatsApp gateway',
      }),
    };

    const failingWhatsAppService = new WhatsAppService(failingProvider);
    const customNotifService = new NotificationService();
    customNotifService.setWhatsAppService(failingWhatsAppService);

    const customReqService = new TestRequestService();
    customReqService.setNotificationService(customNotifService);

    const req = await customReqService.createTestRequest(
      orgId1,
      receptionist1Id,
      'Priya Sharma',
      {
        customerName: 'Resilience Test Jewellers',
        phone: '9822334455',
        item: 'Gold Coin',
        weight: 10.0,
      }
    );

    await customReqService.claimRequest(req.id, orgId1, tester1Id, 'Rahul Verma');

    const result = await customReqService.submitTesterValueAndSend(
      req.id,
      orgId1,
      tester1Id,
      'Rahul Verma',
      {
        testerValue: 2.5,
      }
    );

    // TestRequest is still successfully SENT
    expect(result.testRequest.status).toBe('SENT');
    expect(result.testRequest.testerValue).toBe(2.5);
    // Notification status is flagged as FAILED without crashing the transaction
    expect(result.notificationStatus).toBe('FAILED');
  });
});
