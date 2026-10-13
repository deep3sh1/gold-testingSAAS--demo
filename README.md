# Aurum Touch Lab — Precious Metals Testing & Assay Management SaaS Platform

A multi-tenant, enterprise-grade SaaS platform built for gold purity testing laboratories, assay touch labs, XRF testing centres, and hallmarking refineries.

---

## 🌟 Key Features

1. **Multi-Role Laboratory Terminals**:
   - **Reception Terminal**: Customer intake, digital token generation (e.g. AU-20261013-001), weight entry, instant WhatsApp sharing, and job queuing.
   - **Assay Tester Terminal**: Purity testing queue, live XRF instrument readings, karatage calculation (24K, 22K, 18K), melting loss estimation, and thermal print slip generation.
   - **Admin Terminal**: Multi-branch overview, daily volume tracking, branch performance, and organization settings.

2. **Automated Certificates & Print Slips**:
   - High-resolution digital PDF Assay Certificates.
   - Pre-printed stationery compatibility (removes headers for printing on physical letterheads).
   - Direct WhatsApp certificate delivery via MSG91 API.

3. **Multi-Branch Architecture**:
   - West Branch, East Branch, Central Branch, Metro Hub.
   - Independent branch queues with unified organization admin oversight.

4. **Machine Integration**:
   - WinFTM automated assay spectrum screen-capture agent for live machine readings.

---

## 🏗️ Architecture

`
gold-testingSAAS--demo/
├── client/          # Next.js 14 Web Application (Tailwind CSS, React, Lucide)
├── server/          # Express.js REST API & WebSocket Realtime Engine (MongoDB, PDFKit)
`

---

## 🚀 Quick Start Guide

### 1. Server Setup (server/)
`ash
cd server
npm install
npm run dev
`
*API runs on http://localhost:4000*

### 2. Client Setup (client/)
`ash
cd client
npm install
npm run dev
`
*Application runs on http://localhost:3000*

---

## 🔑 Demo Access Credentials

| Terminal / Role | Username / Email | Password |
|---|---|---|
| **Admin (All Branches)** | dmin@goldscope.io | password123 |
| **Receptionist (West)** | eception.kalyan | password123 |
| **Assay Tester (West)** | 	ester.kalyan | password123 |
| **Receptionist (East)** | eception.kalyaneast | password123 |
| **Assay Tester (East)** | 	ester.kalyaneast | password123 |

---

## 🛡️ License
Proprietary demo application for Precious Metals Assay & Hallmarking SaaS demonstrations.
