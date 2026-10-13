export type Role = 'SUPER_ADMIN' | 'ORGANIZATION_ADMIN' | 'RECEPTIONIST' | 'TESTER';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserDTO {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  timezone: string; // e.g. "Asia/Kolkata"
  tokenPrefix: string; // e.g. "GT"
  defaultWeightUnit: string; // "g"
  defaultTesterValueUnit: string;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: 'ACTIVE' | 'SUSPENDED';
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDTO {
  id: string;
  organizationId: string;
  name: string;
  jewellerName?: string;
  phone: string; // Canonical +91XXXXXXXXXX
  rawPhone: string;
  branch?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TestRequestStatus = 'WAITING' | 'TESTING' | 'SENT';

export interface TestRequestDTO {
  id: string;
  organizationId: string;
  tokenNumber: string;
  branch?: string;
  businessDate: string; // YYYY-MM-DD
  customerId: string;
  customerNameSnapshot: string;
  jewellerName?: string;
  phoneSnapshot: string;
  item: string;
  metalType?: string;
  weight: number;
  weightUnit: string;
  status: TestRequestStatus;
  createdBy: string;
  createdByName?: string;
  assignedTesterId?: string;
  assignedTesterName?: string;
  testerValue?: number;
  testerValueUnit?: string;
  karat?: number;
  claimedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationChannel = 'WHATSAPP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationDTO {
  id: string;
  organizationId: string;
  testRequestId: string;
  channel: NotificationChannel;
  recipientPhone: string;
  templateName: string;
  messagePayload: Record<string, unknown>;
  status: NotificationStatus;
  providerMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'TEST_REQUEST_CREATED'
  | 'TEST_REQUEST_CLAIMED'
  | 'TEST_REQUEST_VALUE_UPDATED'
  | 'TEST_REQUEST_SENT'
  | 'WHATSAPP_SENT'
  | 'WHATSAPP_FAILED';

export interface AuditLogDTO {
  id: string;
  organizationId: string;
  actorUserId: string;
  actorUserName?: string;
  action: AuditAction;
  entityType: 'CUSTOMER' | 'TEST_REQUEST' | 'NOTIFICATION' | 'USER';
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthSessionUser {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
  branch?: string;
  orgCode: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface RealtimeEvents {
  'test-request:created': (data: TestRequestDTO) => void;
  'test-request:claimed': (data: { requestId: string; testerId: string; testerName: string; claimedAt: string }) => void;
  'test-request:completed': (data: { requestId: string; testerValue: number; completedAt: string; notificationStatus: NotificationStatus }) => void;
  'notification:status-update': (data: { notificationId: string; testRequestId: string; status: NotificationStatus }) => void;
}
