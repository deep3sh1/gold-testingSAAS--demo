# 🔬 GOLDSCOPE ASSAY SaaS — Backend API (`lab-saas-server`)

> High-performance, multi-tenant Express & TypeScript REST API with MongoDB, Socket.IO realtime synchronization, atomic token generator, and automated WhatsApp certificate delivery for gold assay testing laboratories.

---

## 🌟 Key Features

- **🏢 Multi-Tenant Architecture**: Complete tenant isolation across database records and realtime WebSocket rooms (`org_${organizationId}`).
- **🔢 Atomic Daily Token Generator**: Concurrency-safe atomic sequence counters with strict Indian business timezone (`Asia/Kolkata`) midnight resets (e.g. `GT-20260912-001`).
- **🛡️ Race-Condition Safe State Machine**: Atomic MongoDB transitions from `WAITING` ➔ `TESTING` (concurrency-locked so only 1 tester claims a sample) ➔ `SENT`.
- **📄 Dynamic PDF Certificate Generation**: Instant high-resolution printable assay test certificates powered by `PDFKit`.
- **💬 WhatsApp Notification Engine**: Modular notification provider architecture supporting **MSG91**, **Meta Cloud API**, **Twilio**, and **Mock Provider** for frictionless local testing.
- **⚡ Realtime Synchronization**: Built-in Socket.IO server emitting live events for request creation, tester claim locks, and customer WhatsApp completions.
- **🚀 Vercel Serverless Ready**: Native serverless handler with cached connection reuse in `api/index.ts` and `vercel.json`.

---

## 📁 Project Structure

```
apps/backend/
├── api/
│   └── index.ts                 # Vercel Serverless entrypoint
├── src/
│   ├── config/
│   │   ├── database.ts          # MongoDB connection with serverless pooling
│   │   └── index.ts             # Environment variables configuration
│   ├── middleware/              # Auth (JWT), Tenant check, RBAC & Validation middlewares
│   ├── modules/
│   │   ├── auth/                # JWT authentication & session verification
│   │   ├── organizations/       # Tenant management & lab settings
│   │   ├── users/               # RBAC user management
│   │   ├── customers/           # Persistent jeweller & customer directory
│   │   ├── daily-tokens/        # Atomic sequence counter logic
│   │   ├── test-requests/       # Test request creation & state transitions
│   │   ├── tester/              # Tester workbench endpoints (claim & submit value)
│   │   ├── notifications/       # Notification queue & status dispatcher
│   │   ├── whatsapp/            # WhatsApp provider implementations (MSG91, Cloud API, etc.)
│   │   ├── pdf/                 # PDF certificate generator service
│   │   └── audit/               # Audit logging service
│   ├── realtime/
│   │   └── socket.ts            # Socket.IO rooms & realtime emitter
│   ├── types/                   # TypeScript DTOs & Domain interfaces
│   ├── shared/                  # Canonical Indian Phone (+91) & Date helpers
│   ├── validation/              # Zod validation schemas
│   ├── app.ts                   # Express application setup
│   ├── seed.ts                  # Idempotent database seeder
│   └── server.ts                # Standalone Node.js HTTP server entrypoint
├── tests/                       # Vitest integration & concurrency test suite
├── package.json
├── tsconfig.json
└── vercel.json                  # Vercel serverless configuration
```

---

## 🛠️ Environment Variables

Create a `.env` file in the root of `apps/backend/` (refer to `.env.example`):

```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000

# MongoDB Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/goldscope_assay?retryWrites=true&w=majority

# Authentication Secrets
JWT_SECRET=your-super-secret-jwt-key-for-dev-2026
JWT_EXPIRES_IN=7d

# WhatsApp Configuration (Options: 'msg91' | 'cloud_api' | 'twilio' | 'mock')
WHATSAPP_PROVIDER=msg91
MSG91_AUTHKEY=your_msg91_auth_key
MSG91_INTEGRATED_NUMBER=15553605603
MSG91_TEMPLATE_NAME=gold_assay_report_pdf
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
pnpm install # or npm install

# 2. Run automated test suite
npm run test

# 3. Start local development server with hot-reload
npm run dev

# 4. Build TypeScript for production
npm run build

# 5. Start compiled production server
npm run start
```

API Server starts on: `http://localhost:4000`
Health Check: `http://localhost:4000/api/health`

---

## 🔑 Demo Login Accounts (Auto-seeded)

| Role | Email | Password | Allowed Workflows |
|---|---|---|---|
| **Receptionist** | `reception@goldscope.io` | `password123` | Create customers, create requests, print tokens |
| **Assay Tester** | `tester@goldscope.io` | `password123` | Claim requests, enter assay values, send WhatsApp |
| **Org Admin** | `admin@goldscope.io` | `password123` | Tenant-wide requests list, customer list, audit logs |

---

## ☁️ Vercel Deployment

1. Import this repository into [Vercel](https://vercel.com).
2. Set Framework Preset to **Other** (Root directory: `.`).
3. Add the environment variables from the section above (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, etc.).
4. Deploy! Your API will be live at `https://<your-project>.vercel.app`.
