import { z } from 'zod';
import { normalizeIndianPhone } from '../shared/index';

// Custom Zod Indian Phone Validator
export const indianPhoneSchema = z.string().transform((val, ctx) => {
  const norm = normalizeIndianPhone(val);
  if (!norm.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: norm.error || 'Invalid Indian phone number',
    });
    return z.NEVER;
  }
  return norm.canonical;
});

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Customer Schemas
export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer or M/s name must be at least 2 characters').max(100),
  phone: indianPhoneSchema,
  rawPhone: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100),
});

// Test Request Creation (Reception Form)
export const createTestRequestSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().trim().min(2, 'Customer name is required').max(100),
  jewellerName: z.string().trim().max(100).optional().default(''),
  phone: indianPhoneSchema,
  item: z.string().trim().min(2, 'Item description is required (e.g. Chain, Bangle, Coin)').max(100),
  metalType: z.enum(['GOLD', 'SILVER']).optional().default('GOLD'),
  weight: z.number({ invalid_type_error: 'Weight must be a valid number' }).positive('Weight must be greater than 0').max(100000, 'Weight exceeds reasonable limit'),
  weightUnit: z.string().default('g'),
});

export type CreateTestRequestInput = z.infer<typeof createTestRequestSchema>;

// Tester Claim Request Schema
export const claimTestRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
});

// Tester Value Entry & Send Schema
export const submitTesterValueSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  testerValue: z
    .number({ invalid_type_error: 'Tester value must be a valid number' })
    .finite('Tester value must be finite')
    .min(0, 'Tester value cannot be negative'),
  testerValueUnit: z.string().max(20).optional(),
});

export type SubmitTesterValueInput = z.infer<typeof submitTesterValueSchema>;

// Queue & Search Filter Schemas
export const testRequestQuerySchema = z.object({
  search: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  status: z.enum(['WAITING', 'TESTING', 'SENT', 'ALL']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  page: z.coerce.number().min(1).default(1),
});

export type TestRequestQueryInput = z.infer<typeof testRequestQuerySchema>;
