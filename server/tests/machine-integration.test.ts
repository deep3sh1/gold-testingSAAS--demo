import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { OrganizationModel } from '../src/modules/organizations/organization.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { CustomerModel } from '../src/modules/customers/customer.model.js';
import { TestRequestModel } from '../src/modules/test-requests/test-request.model.js';
import { NotificationModel } from '../src/modules/notifications/notification.model.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

describe('WinFTM Machine Ingestion & Automated WhatsApp Pipeline', () => {
  const app = createApp();
  let orgId: string;
  let testerUser: any;
  let token: string;

  beforeEach(async () => {
    const org = await OrganizationModel.create({
      name: 'Aurum Touch Lab',
      slug: 'aurum-lab',
      code: 'ATL',
      settings: {
        timezone: 'Asia/Kolkata',
        tokenPrefix: 'ATL',
        defaultWeightUnit: 'g',
        defaultTesterValueUnit: '%',
      },
    });
    orgId = String(org._id);

    testerUser = await UserModel.create({
      organizationId: org._id,
      name: 'Purity Tester 1',
      email: 'tester1@aurum.io',
      passwordHash: 'hashed_pw',
      role: 'TESTER',
      status: 'ACTIVE',
    });

    token = jwt.sign(
      {
        userId: String(testerUser._id),
        organizationId: orgId,
        email: testerUser.email,
        name: testerUser.name,
        role: testerUser.role,
        orgCode: 'NTL',
      },
      config.jwtSecret
    );
  });

  it('should auto-match active waiting token, ingest multi-element readings, complete test request, and trigger WhatsApp', async () => {
    // 1. Create Customer & Test Request at reception
    const customer = await CustomerModel.create({
      organizationId: orgId,
      name: 'Rajesh Jewellers',
      phone: '+919876543210',
      rawPhone: '9876543210',
    });

    const testReq = await TestRequestModel.create({
      organizationId: orgId,
      tokenNumber: 'NTL-101',
      businessDate: '2026-09-23',
      customerId: customer._id,
      customerNameSnapshot: customer.name,
      phoneSnapshot: customer.phone,
      item: 'Gold Chain',
      weight: 15.45,
      weightUnit: 'g',
      status: 'WAITING',
      createdBy: testerUser._id,
    });

    // 2. WinFTM Local Agent posts reading
    const machineReading = {
      stationId: 'WINFTM-BENCH-01',
      purityPercent: 87.45,
      karat: 20.99,
      elements: {
        AU: 87.45,
        AG: 4.293,
        CU: 6.967,
        ZN: 0.998,
        CD: 0.241,
        FE: 0.025,
        BI: 0.021,
      },
      autoComplete: true,
      readingNumber: '001',
    };

    const res = await request(app)
      .post('/api/v1/machine/ingest')
      .set('x-organization-id', orgId)
      .send(machineReading);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.matched).toBe(true);
    expect(res.body.data.testRequest.tokenNumber).toBe('NTL-101');
    expect(res.body.data.testRequest.testerValue).toBe(87.45);
    expect(res.body.data.testRequest.karat).toBe(20.99);
    expect(res.body.data.testRequest.status).toBe('SENT');
    expect(res.body.data.notificationStatus).toBe('SENT');

    // 3. Verify DB record has updated
    const updated = await TestRequestModel.findById(testReq._id);
    expect(updated?.status).toBe('SENT');
    expect(updated?.testerValue).toBe(87.45);
    expect(updated?.karat).toBe(20.99);
    expect(updated?.elements).toHaveProperty('CU', 6.967);

    // 4. Verify WhatsApp Notification record created in DB
    const notifs = await NotificationModel.find({ testRequestId: testReq._id });
    expect(notifs.length).toBe(1);
    expect(notifs[0].status).toBe('SENT');
    expect(notifs[0].recipientPhone).toBe('+919876543210');
  });

  it('should accept heartbeat from local agent', async () => {
    const res = await request(app)
      .post('/api/v1/machine/heartbeat')
      .set('x-organization-id', orgId)
      .send({
        stationId: 'WINFTM-BENCH-01',
        stationName: 'Fischer XRF Bench 1',
        softwareVersion: 'WinFTM 6.4.1',
        status: 'ONLINE',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Station heartbeat recorded');
  });
});
