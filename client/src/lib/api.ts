import { ApiResponse, UserDTO, CustomerDTO, TestRequestDTO, AuthSessionUser } from '@goldscope/types';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const CLEAN_API_URL = RAW_API_URL.replace(/\/+$/, '');
export const API_BASE_URL = CLEAN_API_URL.endsWith('/api/v1') ? CLEAN_API_URL : `${CLEAN_API_URL}/api/v1`;

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  // On Vercel hosted domain, use same-origin /api/v1 proxy so browser never triggers cross-origin CORS or Vercel WAF challenges
  const isVercelBrowser = !isServer && window.location.hostname.endsWith('vercel.app');
  const primaryBase = isVercelBrowser ? '/api/v1' : API_BASE_URL;
  const url = `${primaryBase}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Retrieve token from localStorage if available (client-side)
  if (!isServer) {
    const token = localStorage.getItem('goldscope_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // sends cookies
    });
  } catch (netErr: any) {
    // If primary fetch was blocked (e.g. cross-origin CORS), fallback to same-origin proxy
    if (!isServer && url !== `/api/v1${endpoint}`) {
      try {
        res = await fetch(`/api/v1${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } catch {
        throw netErr;
      }
    } else {
      throw netErr;
    }
  }

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
  login: (data: { email: string; password: string }) =>
    fetcher<{ token: string; user: UserDTO; session: AuthSessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => fetcher<{ user: UserDTO; session: AuthSessionUser }>('/auth/me'),
  logout: () => fetcher<{ message: string }>('/auth/logout', { method: 'POST' }),

  // Customers
  searchCustomers: (q: string, branch?: string) =>
    fetcher<CustomerDTO[]>(`/customers/search?q=${encodeURIComponent(q)}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`),
  listCustomers: (limit: number = 50, branch?: string) =>
    fetcher<CustomerDTO[]>(`/customers?limit=${limit}${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`),
  createCustomer: (data: { name: string; phone: string; notes?: string }) =>
    fetcher<CustomerDTO>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Test Requests (Reception)
  createTestRequest: (data: {
    customerId?: string;
    customerName: string;
    jewellerName?: string;
    phone: string;
    item: string;
    metalType?: 'GOLD' | 'SILVER';
    weight: number;
    weightUnit?: string;
    branch?: string;
  }) =>
    fetcher<TestRequestDTO>('/test-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listTestRequests: (params?: { search?: string; date?: string; status?: string; branch?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.date) searchParams.set('date', params.date);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.branch) searchParams.set('branch', params.branch);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return fetcher<{ items: TestRequestDTO[]; total: number }>(`/test-requests?${searchParams.toString()}`);
  },
  getTestRequestById: (id: string) => fetcher<TestRequestDTO>(`/test-requests/${id}`),

  // Tester Workflow
  getTesterQueue: (params?: { search?: string; date?: string; status?: string; branch?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.date) searchParams.set('date', params.date);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.branch) searchParams.set('branch', params.branch);
    return fetcher<{ items: TestRequestDTO[]; total: number }>(`/tester/queue?${searchParams.toString()}`);
  },
  claimRequest: (requestId: string) =>
    fetcher<TestRequestDTO>('/tester/claim', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    }),
  submitTesterValue: (data: { requestId: string; testerValue: number; testerValueUnit?: string }) =>
    fetcher<TestRequestDTO>('/tester/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
