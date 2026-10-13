import bcrypt from 'bcryptjs';
import { OrganizationModel } from './modules/organizations/organization.model.js';
import { UserModel } from './modules/users/user.model.js';
import { CustomerModel } from './modules/customers/customer.model.js';
import { TestRequestModel } from './modules/test-requests/test-request.model.js';

export async function seedDatabase(): Promise<void> {
  try {
    let primaryOrg = await OrganizationModel.findOne({ code: 'GN' });
    if (!primaryOrg) {
      primaryOrg = await OrganizationModel.findOne();
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    if (!primaryOrg) {
      console.log('[Seed] Populating initial tenant organizations and users...');
      primaryOrg = await OrganizationModel.create({
        name: 'Aurum Touch Lab',
        slug: 'aurum-touch-lab',
        code: 'AU',
        status: 'ACTIVE',
        settings: {
          timezone: 'Asia/Kolkata',
          tokenPrefix: 'AU',
          defaultWeightUnit: 'g',
          defaultTesterValueUnit: '',
        },
      });

      // Second Tenant: Kalyan Bullion (for multi-tenancy verification)
      await OrganizationModel.create({
        name: 'Kalyan Bullion Testing',
        slug: 'kalyan-bullion',
        code: 'KB',
        status: 'ACTIVE',
        settings: {
          timezone: 'Asia/Kolkata',
          tokenPrefix: 'KB',
          defaultWeightUnit: 'g',
          defaultTesterValueUnit: '',
        },
      });
    } else if (primaryOrg.name && primaryOrg.name.toLowerCase().includes('nagesh')) {
      primaryOrg.name = 'Aurum Touch Lab';
      await primaryOrg.save();
    }

    // Ensure all 4 Branch Users exist with password123
    const branchUsers = [
      // 1. Kalyan (West)
      {
        email: 'reception.kalyan@goldscope.io',
        name: 'Reception (Kalyan West)',
        role: 'RECEPTIONIST' as const,
        branch: 'kalyan',
      },
      {
        email: 'tester.kalyan@goldscope.io',
        name: 'Tester (Kalyan West)',
        role: 'TESTER' as const,
        branch: 'kalyan',
      },
      // 2. Kalyan (East)
      {
        email: 'reception.kalyaneast@goldscope.io',
        name: 'Reception (Kalyan East)',
        role: 'RECEPTIONIST' as const,
        branch: 'kalyan_east',
      },
      {
        email: 'tester.kalyaneast@goldscope.io',
        name: 'Tester (Kalyan East)',
        role: 'TESTER' as const,
        branch: 'kalyan_east',
      },
      // 3. Ulhasnagar
      {
        email: 'reception.ulhasnagar@goldscope.io',
        name: 'Reception (Ulhasnagar)',
        role: 'RECEPTIONIST' as const,
        branch: 'ulhasnagar',
      },
      {
        email: 'tester.ulhasnagar@goldscope.io',
        name: 'Tester (Ulhasnagar)',
        role: 'TESTER' as const,
        branch: 'ulhasnagar',
      },
      // 4. Dombivli
      {
        email: 'reception.dombivali@goldscope.io',
        name: 'Reception (Dombivli East)',
        role: 'RECEPTIONIST' as const,
        branch: 'dombivali',
      },
      {
        email: 'tester.dombivali@goldscope.io',
        name: 'Tester (Dombivli East)',
        role: 'TESTER' as const,
        branch: 'dombivali',
      },
    ];

    for (const bu of branchUsers) {
      const existing = await UserModel.findOne({ email: bu.email });
      if (!existing) {
        await UserModel.create({
          organizationId: primaryOrg._id,
          name: bu.name,
          email: bu.email,
          passwordHash,
          role: bu.role,
          branch: bu.branch,
          status: 'ACTIVE',
        });
      } else {
        existing.branch = bu.branch;
        existing.role = bu.role;
        existing.status = 'ACTIVE';
        await existing.save();
      }
    }

    // Default Demo Users
    const defaultUsers = [
      {
        name: 'Priya Sharma (Reception)',
        email: 'reception@goldscope.io',
        role: 'RECEPTIONIST' as const,
        branch: 'kalyan',
      },
      {
        name: 'Rahul Verma (Tester)',
        email: 'tester@goldscope.io',
        role: 'TESTER' as const,
        branch: 'kalyan',
      },
      {
        name: 'Admin',
        email: 'admin@goldscope.io',
        role: 'ORGANIZATION_ADMIN' as const,
        branch: 'all',
      },
    ];

    for (const du of defaultUsers) {
      const existing = await UserModel.findOne({ email: du.email });
      if (!existing) {
        await UserModel.create({
          organizationId: primaryOrg._id,
          name: du.name,
          email: du.email,
          passwordHash,
          role: du.role,
          branch: du.branch,
          status: 'ACTIVE',
        });
      } else {
        existing.name = du.name;
        existing.branch = du.branch;
        existing.role = du.role;
        existing.status = 'ACTIVE';
        await existing.save();
      }
    }

    // Explicitly update existing Admin account across all branches
    await UserModel.updateOne(
      { email: 'admin@goldscope.io' },
      { $set: { name: 'Admin', branch: 'all' } }
    );

    // Seed Initial Customer & Sample Completed Request if none exist
    const custCount = await CustomerModel.countDocuments({ organizationId: primaryOrg._id });
    if (custCount === 0) {
      const c1 = await CustomerModel.create({
        organizationId: primaryOrg._id,
        name: 'ABC Jewellers',
        phone: '+919876543210',
        rawPhone: '9876543210',
        notes: 'Wholesale client in Zaveri Bazaar',
      });

      const firstUser = await UserModel.findOne({ organizationId: primaryOrg._id });
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const todayDateStr = new Date().toISOString().split('T')[0];

      // Sample 1: 22K Hallmark Finished
      await TestRequestModel.create({
        organizationId: primaryOrg._id,
        tokenNumber: `AU-${todayStr}-001`,
        businessDate: todayDateStr,
        customerId: c1._id,
        customerNameSnapshot: 'Shreeji Jewellers',
        jewellerName: 'Shreeji Jewellers',
        phoneSnapshot: '+919876543210',
        item: 'Gold Bangle (22K Hallmark)',
        metalType: 'GOLD',
        weight: 24.500,
        weightUnit: 'g',
        status: 'SENT',
        branch: 'kalyan',
        createdBy: firstUser?._id,
        testerValue: 91.65,
        testerValueUnit: '%',
        karat: 22.00,
        readingNumber: 'RD-9101',
        completedAt: new Date(),
        reports: [
          {
            reportType: 'MACHINE_XRF',
            testerValue: 91.65,
            testerValueUnit: '%',
            karat: 22.00,
            readingNumber: 'RD-9101',
            submittedAt: new Date(),
          },
        ],
      });

      // Sample 2: 24K Bullion Bar Finished
      await TestRequestModel.create({
        organizationId: primaryOrg._id,
        tokenNumber: `AU-${todayStr}-002`,
        businessDate: todayDateStr,
        customerId: c1._id,
        customerNameSnapshot: 'Zaveri Bullion Trading',
        jewellerName: 'Zaveri Bullion Trading',
        phoneSnapshot: '+919820099999',
        item: 'Gold Bar 999.0 (Bullion Assay)',
        metalType: 'GOLD',
        weight: 50.000,
        weightUnit: 'g',
        status: 'SENT',
        branch: 'kalyan',
        createdBy: firstUser?._id,
        testerValue: 99.92,
        testerValueUnit: '%',
        karat: 24.00,
        readingNumber: 'RD-9102',
        completedAt: new Date(),
        reports: [
          {
            reportType: 'MACHINE_XRF',
            testerValue: 99.92,
            testerValueUnit: '%',
            karat: 24.00,
            readingNumber: 'RD-9102',
            submittedAt: new Date(),
          },
        ],
      });

      // Sample 3: In Testing queue (ready for live testing demo)
      await TestRequestModel.create({
        organizationId: primaryOrg._id,
        tokenNumber: `AU-${todayStr}-003`,
        businessDate: todayDateStr,
        customerId: c1._id,
        customerNameSnapshot: 'Royal Ornaments',
        jewellerName: 'Royal Ornaments',
        phoneSnapshot: '+919811122233',
        item: 'Gold Ring (18K Assay)',
        metalType: 'GOLD',
        weight: 6.840,
        weightUnit: 'g',
        status: 'WAITING',
        branch: 'kalyan',
        createdBy: firstUser?._id,
      });
    }

    console.log('[Seed] Database successfully seeded with 4 branches and demo accounts:');
    console.log('  - Kalyan (West):   reception.kalyan / tester.kalyan (Pass: password123)');
    console.log('  - Kalyan (East):   reception.kalyaneast / tester.kalyaneast (Pass: password123)');
    console.log('  - Ulhasnagar:      reception.ulhasnagar / tester.ulhasnagar (Pass: password123)');
    console.log('  - Dombivli (East): reception.dombivali / tester.dombivali (Pass: password123)');
  } catch (err) {
    console.error('[Seed] Seeding failed:', err);
  }
}
