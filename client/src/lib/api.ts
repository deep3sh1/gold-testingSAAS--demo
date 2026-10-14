import { ApiResponse, UserDTO, CustomerDTO, TestRequestDTO, AuthSessionUser } from '@goldscope/types';

// Strictly local or user-configured demo backend URL (NEVER points to main client's server)
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const CLEAN_API_URL = RAW_API_URL.replace(/\/+$/, '');
export const API_BASE_URL = CLEAN_API_URL.endsWith('/api/v1') ? CLEAN_API_URL : `${CLEAN_API_URL}/api/v1`;

// =========================================================================
// Standalone LocalStorage Demo Engine (100% Isolated, Zero Client Connection)
// =========================================================================

const SEED_CUSTOMERS: CustomerDTO[] = [
  {
    id: 'cust-demo-1',
    name: 'Ramesh Sharma',
    phone: '+919876543210',
    rawPhone: '9876543210',
    jewellerName: 'ABC Jewellers',
    organizationId: 'demo-org',
    branch: 'kalyan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-demo-2',
    name: 'Suresh Patil',
    phone: '+919876543211',
    rawPhone: '9876543211',
    jewellerName: 'Royal Jewellers',
    organizationId: 'demo-org',
    branch: 'kalyan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust-demo-3',
    name: 'Priya Verma',
    phone: '+919876543212',
    rawPhone: '9876543212',
    jewellerName: 'R.K. Bullion',
    organizationId: 'demo-org',
    branch: 'kalyaneast',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_REQUESTS: TestRequestDTO[] = [
  {
    id: 'req-demo-1',
    organizationId: 'demo-org',
    branch: 'kalyan',
    businessDate: new Date().toISOString().slice(0, 10),
    tokenNumber: 'AU-001',
    customerId: 'cust-demo-1',
    customerNameSnapshot: 'Ramesh Sharma',
    jewellerName: 'ABC Jewellers',
    phoneSnapshot: '+919876543210',
    item: 'Gold Chain (22K)',
    metalType: 'GOLD',
    weight: 24.500,
    weightUnit: 'g',
    status: 'WAITING',
    createdBy: 'reception-demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-demo-2',
    organizationId: 'demo-org',
    branch: 'kalyan',
    businessDate: new Date().toISOString().slice(0, 10),
    tokenNumber: 'AU-002',
    customerId: 'cust-demo-2',
    customerNameSnapshot: 'Suresh Patil',
    jewellerName: 'Royal Jewellers',
    phoneSnapshot: '+919876543211',
    item: 'Gold Bangle (916)',
    metalType: 'GOLD',
    weight: 18.250,
    weightUnit: 'g',
    status: 'TESTING',
    createdBy: 'reception-demo',
    assignedTesterId: 'tester-1',
    assignedTesterName: 'Assay Tester',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'req-demo-3',
    organizationId: 'demo-org',
    branch: 'kalyan',
    businessDate: new Date().toISOString().slice(0, 10),
    tokenNumber: 'AU-003',
    customerId: 'cust-demo-3',
    customerNameSnapshot: 'Priya Verma',
    jewellerName: 'R.K. Bullion',
    phoneSnapshot: '+919876543212',
    item: 'Gold Ring',
    metalType: 'GOLD',
    weight: 8.420,
    weightUnit: 'g',
    status: 'SENT',
    createdBy: 'reception-demo',
    assignedTesterId: 'tester-1',
    assignedTesterName: 'Assay Tester',
    testerValue: 91.60,
    testerValueUnit: '%',
    karat: 21.98,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getStoredRequests(): TestRequestDTO[] {
  if (typeof window === 'undefined') return SEED_REQUESTS;
  try {
    const raw = localStorage.getItem('aurum_demo_requests');
    if (!raw) {
      localStorage.setItem('aurum_demo_requests', JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_REQUESTS;
  }
}

function persistRequests(reqs: TestRequestDTO[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('aurum_demo_requests', JSON.stringify(reqs));
  } catch {}
}

function getStoredCustomers(): CustomerDTO[] {
  if (typeof window === 'undefined') return SEED_CUSTOMERS;
  try {
    const raw = localStorage.getItem('aurum_demo_customers');
    if (!raw) {
      localStorage.setItem('aurum_demo_customers', JSON.stringify(SEED_CUSTOMERS));
      return SEED_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_CUSTOMERS;
  }
}

function persistCustomers(custs: CustomerDTO[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('aurum_demo_customers', JSON.stringify(custs));
  } catch {}
}

// Low-level HTTP fetcher (calls local / configured backend; never throws to external servers)
async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!isServer) {
    const token = localStorage.getItem('goldscope_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: { code: 'HTTP_ERROR', message: `Server returned status ${res.status}` },
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || json.message || 'Request failed');
  }

  return json.data as T;
}

export const api = {
  // Auth
  login: async (data: { email: string; password: string }) => {
    try {
      return await fetcher<{ token: string; user: UserDTO; session: AuthSessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      // Local demo fallback for all station presets
      const lower = data.email.toLowerCase();
      const role = lower.includes('admin')
        ? 'ORGANIZATION_ADMIN'
        : lower.includes('tester')
        ? 'TESTER'
        : 'RECEPTIONIST';
      const branchMatch = lower.match(/(kalyaneast|kalyan|ulhasnagar|dombivali)/);
      const branch = branchMatch ? branchMatch[1] : 'kalyan';

      const mockUser: UserDTO = {
        id: `user-${Date.now()}`,
        name: role === 'ORGANIZATION_ADMIN' ? 'Lab Admin' : role === 'TESTER' ? 'Assay Tester' : 'Reception Desk',
        email: data.email,
        role: role as any,
        branch,
        organizationId: 'demo-org',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockSession: AuthSessionUser = {
        userId: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        branch: mockUser.branch,
        organizationId: mockUser.organizationId,
        orgCode: 'AU',
      };

      return {
        token: `demo-token-${Date.now()}`,
        user: mockUser,
        session: mockSession,
      };
    }
  },

  getMe: async () => {
    try {
      return await fetcher<{ user: UserDTO; session: AuthSessionUser }>('/auth/me');
    } catch {
      // Return cached user or default demo admin
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('goldscope_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const session: AuthSessionUser = {
              userId: parsed.id || parsed.userId || 'user-demo',
              name: parsed.name || 'Demo User',
              email: parsed.email || 'demo@lab.com',
              role: parsed.role || 'ORGANIZATION_ADMIN',
              branch: parsed.branch || 'kalyan',
              organizationId: parsed.organizationId || 'demo-org',
              orgCode: parsed.orgCode || 'AU',
            };
            return { user: parsed, session };
          } catch {}
        }
      }
      const fallbackUser: UserDTO = {
        id: 'user-demo-admin',
        name: 'Lab Admin',
        email: 'admin',
        role: 'ORGANIZATION_ADMIN',
        branch: 'kalyan',
        organizationId: 'demo-org',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const fallbackSession: AuthSessionUser = {
        userId: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        role: fallbackUser.role,
        branch: fallbackUser.branch,
        organizationId: fallbackUser.organizationId,
        orgCode: 'AU',
      };
      return { user: fallbackUser, session: fallbackSession };
    }
  },

  logout: async () => {
    try {
      return await fetcher<{ message: string }>('/auth/logout', { method: 'POST' });
    } catch {
      return { message: 'Logged out locally' };
    }
  },

  // Customers
  searchCustomers: async (q: string, branch?: string) => {
    try {
      return await fetcher<CustomerDTO[]>(
        `/customers/search?q=${encodeURIComponent(q)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`
      );
    } catch {
      const all = getStoredCustomers();
      const lower = q.toLowerCase();
      return all.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.phone.includes(lower) ||
          (c.jewellerName && c.jewellerName.toLowerCase().includes(lower))
      );
    }
  },

  listCustomers: async (limit: number = 50, branch?: string) => {
    try {
      return await fetcher<CustomerDTO[]>(
        `/customers?limit=${limit}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`
      );
    } catch {
      const all = getStoredCustomers();
      return all.slice(0, limit);
    }
  },

  createCustomer: async (data: { name: string; phone: string; notes?: string }) => {
    try {
      const created = await fetcher<CustomerDTO>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const current = getStoredCustomers();
      persistCustomers([created, ...current.filter((c) => c.id !== created.id)]);
      return created;
    } catch {
      const newCustomer: CustomerDTO = {
        id: `cust-${Date.now()}`,
        name: data.name,
        phone: data.phone,
        rawPhone: data.phone.replace(/[^0-9]/g, ''),
        notes: data.notes,
        organizationId: 'demo-org',
        branch: 'kalyan',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = getStoredCustomers();
      persistCustomers([newCustomer, ...current]);
      return newCustomer;
    }
  },

  // Test Requests (Reception)
  createTestRequest: async (data: {
    customerId?: string;
    customerName: string;
    jewellerName?: string;
    phone: string;
    item: string;
    metalType?: 'GOLD' | 'SILVER';
    weight: number;
    weightUnit?: string;
    branch?: string;
  }) => {
    try {
      const result = await fetcher<TestRequestDTO>('/test-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const current = getStoredRequests();
      persistRequests([result, ...current.filter((r) => r.id !== result.id)]);
      return result;
    } catch {
      // LocalStorage Demo Request Creation (Guaranteed 100% Isolated)
      const current = getStoredRequests();
      const seq = current.length + 1;
      const tokenNum = `AU-${String(seq).padStart(3, '0')}`;
      const now = new Date();

      const newReq: TestRequestDTO = {
        id: `req-${Date.now()}`,
        organizationId: 'demo-org',
        branch: data.branch || 'kalyan',
        businessDate: now.toISOString().slice(0, 10),
        tokenNumber: tokenNum,
        createdBy: 'reception-demo',
        customerId: data.customerId || `cust-${Date.now()}`,
        customerNameSnapshot: data.customerName,
        jewellerName: data.jewellerName,
        phoneSnapshot: data.phone,
        item: data.item,
        metalType: data.metalType || 'GOLD',
        weight: data.weight,
        weightUnit: data.weightUnit || 'g',
        status: 'WAITING',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      persistRequests([newReq, ...current]);
      return newReq;
    }
  },

  listTestRequests: async (params?: { search?: string; date?: string; status?: string; branch?: string; limit?: number }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.date) searchParams.set('date', params.date);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.branch) searchParams.set('branch', params.branch);
      if (params?.limit) searchParams.set('limit', String(params.limit));

      const res = await fetcher<{ items: TestRequestDTO[]; total: number }>(`/test-requests?${searchParams.toString()}`);
      if (res && res.items) {
        // Sync to local storage
        persistRequests(res.items);
      }
      return res;
    } catch {
      let items = getStoredRequests();
      if (params?.branch && params.branch !== 'all') {
        items = items.filter((r) => !r.branch || r.branch === params.branch);
      }
      if (params?.status && params.status !== 'ALL') {
        items = items.filter((r) => r.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (r) =>
            r.tokenNumber.toLowerCase().includes(q) ||
            r.customerNameSnapshot.toLowerCase().includes(q) ||
            r.phoneSnapshot.includes(q) ||
            r.item.toLowerCase().includes(q)
        );
      }
      return { items, total: items.length };
    }
  },

  getTestRequestById: async (id: string) => {
    try {
      return await fetcher<TestRequestDTO>(`/test-requests/${id}`);
    } catch {
      const items = getStoredRequests();
      const found = items.find((r) => r.id === id || r.tokenNumber === id);
      if (!found) {
        throw new Error(`Test request ${id} not found in demo storage`);
      }
      return found;
    }
  },

  // Tester Workflow
  getTesterQueue: async (params?: { search?: string; date?: string; status?: string; branch?: string }) => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.date) searchParams.set('date', params.date);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.branch) searchParams.set('branch', params.branch);

      const res = await fetcher<{ items: TestRequestDTO[]; total: number }>(`/tester/queue?${searchParams.toString()}`);
      if (res && res.items) {
        persistRequests(res.items);
      }
      return res;
    } catch {
      let items = getStoredRequests();
      if (params?.branch && params.branch !== 'all') {
        items = items.filter((r) => !r.branch || r.branch === params.branch);
      }
      if (params?.status && params.status !== 'ALL') {
        items = items.filter((r) => r.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (r) =>
            r.tokenNumber.toLowerCase().includes(q) ||
            r.customerNameSnapshot.toLowerCase().includes(q) ||
            r.phoneSnapshot.includes(q) ||
            r.item.toLowerCase().includes(q)
        );
      }
      return { items, total: items.length };
    }
  },

  claimRequest: async (requestId: string) => {
    try {
      const updated = await fetcher<TestRequestDTO>('/tester/claim', {
        method: 'POST',
        body: JSON.stringify({ requestId }),
      });
      const current = getStoredRequests();
      persistRequests(current.map((r) => (r.id === requestId ? updated : r)));
      return updated;
    } catch {
      const current = getStoredRequests();
      const target = current.find((r) => r.id === requestId);
      if (!target) throw new Error('Request not found');

      const updated: TestRequestDTO = {
        ...target,
        status: 'TESTING',
        assignedTesterId: 'tester-local',
        assignedTesterName: 'Assay Tester',
        updatedAt: new Date().toISOString(),
      };
      persistRequests(current.map((r) => (r.id === requestId ? updated : r)));
      return updated;
    }
  },

  submitTesterValue: async (data: { requestId: string; testerValue: number; testerValueUnit?: string }) => {
    try {
      const updated = await fetcher<TestRequestDTO>('/tester/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const current = getStoredRequests();
      persistRequests(current.map((r) => (r.id === data.requestId ? updated : r)));
      return updated;
    } catch {
      const current = getStoredRequests();
      const target = current.find((r) => r.id === data.requestId);
      if (!target) throw new Error('Request not found');

      const isSilver = target.metalType === 'SILVER';
      const karat = isSilver ? undefined : parseFloat(((data.testerValue * 24) / 100).toFixed(2));

      const updated: TestRequestDTO = {
        ...target,
        status: 'SENT',
        testerValue: data.testerValue,
        testerValueUnit: data.testerValueUnit || '%',
        karat,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistRequests(current.map((r) => (r.id === data.requestId ? updated : r)));
      return updated;
    }
  },
};
