# ✨ GOLDSCOPE ASSAY SaaS — Frontend Web App (`lab-saas-client`)

> Modern, ultra-responsive Next.js 14 SaaS frontend for precious metal testing laboratories with live Socket.IO realtime synchronisation, reception intake, and assay tester workbench.

---

## 🌟 Key Features

- **⚡ Next.js 14 (App Router)**: Blazing fast server-side rendering, static generation, and optimized client components.
- **🎨 Premium Dark Luxury UI**: Glassmorphism, Tailwind CSS, Gold & Obsidian tailored color palette, and micro-animations.
- **🛎️ Reception Intake & Token Generator**:
  - Auto-normalizing Indian phone numbers (`+91XXXXXXXXXX`).
  - Instant customer lookup with debounce.
  - Printable atomic token receipt modal with barcode styling.
- **🔬 Realtime Tester Workbench (`/tester/queue`)**:
  - Live testing queue synchronized in realtime across testers via Socket.IO.
  - Concurrency claim locking ("Take Request") to prevent multiple testers grabbing the same piece.
  - Fast numeric assay value entry with instant customer WhatsApp trigger.
  - Direct PDF certificate download and WhatsApp Web direct links.
  - Flexible filters with "Today", "All Dates", custom calendar, and status pills.
- **📊 Reception Dashboard & Live Stream**:
  - Live counter cards (Waiting, In Testing, Completed, Total Weight in grams).
  - Searchable stream of today's incoming test batches.
- **👥 Customer Directory (`/reception/customers`)**: Persistent jeweller address book with test history.
- **🔐 One-Click Demo Switcher**: Instant login presets for Receptionist, Tester, and Admin personas.

---

## 📁 Project Structure

```
apps/client/
├── src/
│   ├── app/
│   │   ├── login/               # One-click demo login & authentication
│   │   ├── reception/
│   │   │   ├── dashboard/       # Receptionist today's queue & live metrics
│   │   │   ├── requests/new/    # Rapid sample intake form & token modal
│   │   │   ├── requests/        # Historical searchable test request archive
│   │   │   └── customers/       # Jeweller customer directory
│   │   ├── tester/
│   │   │   └── queue/           # Live realtime testing workbench
│   │   ├── globals.css          # Design system, glass-panel tokens, and scrollbars
│   │   ├── layout.tsx           # Global root layout with persistent navbar
│   │   └── page.tsx             # Role-based landing redirector
│   ├── components/
│   │   └── layout/Navbar.tsx    # Live clock (IST), tenant badge & role nav links
│   ├── hooks/
│   │   └── useAuth.tsx          # Client auth context and role guard
│   ├── lib/
│   │   ├── api.ts               # Centralized typed API fetcher
│   │   └── socket.ts            # Socket.IO client instance with auto-reconnect
│   ├── types/                   # Frontend TypeScript DTOs
│   ├── shared/                  # Date formatting (IST) & phone normalization
│   └── validation/              # Zod validation schemas
├── next.config.mjs              # Dynamic API reverse proxy rewrites
├── tailwind.config.js           # GoldScope luxury design palette
├── tsconfig.json
└── vercel.json                  # Next.js deployment configuration
```

---

## 🛠️ Environment Variables

Create a `.env.local` file in `apps/client/`:

```env
# URL of your deployed or local Backend API (must include /api/v1 for REST calls)
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Base URL of Backend API (for Socket.IO and asset links)
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
API_URL=http://localhost:4000
```

> **When deploying on Vercel:** Set `NEXT_PUBLIC_API_URL` to `https://<YOUR-BACKEND-API>.vercel.app/api/v1` and `NEXT_PUBLIC_SOCKET_URL` to `https://<YOUR-BACKEND-API>.vercel.app`.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
pnpm install # or npm install

# 2. Start Next.js development server
npm run dev

# 3. Build for production
npm run build

# 4. Start production server
npm run start
```

Frontend will open at: `http://localhost:3000`

---

## 🔑 Demo Login Accounts

| Role | Email | Password | What to test |
|---|---|---|---|
| **Receptionist** | `reception@goldscope.io` | `password123` | Create new requests, search customers, generate tokens |
| **Assay Tester** | `tester@goldscope.io` | `password123` | Claim items from queue, enter assay value, send WhatsApp report |
| **Org Admin** | `admin@goldscope.io` | `password123` | Overview of all requests and audit records |

---

## ☁️ Vercel Deployment

1. Import this repository into [Vercel](https://vercel.com).
2. Framework Preset will automatically be detected as **Next.js** (Root directory: `.`).
3. Add the environment variables:
   - `NEXT_PUBLIC_API_URL`: `https://<your-backend-api>.vercel.app/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<your-backend-api>.vercel.app`
   - `API_URL`: `https://<your-backend-api>.vercel.app`
4. Click **Deploy**!
