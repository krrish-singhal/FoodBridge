# FoodBridge — Deployment & Environment Configuration Guide

**Document Version:** 2.0  
**Target Platform:** Next.js (App Router), Supabase PostgreSQL, Node.js 18+  
**Status:** Production Ready

---

## 1. Environment Variables Specification

Ensure all following variables are set in your deployment environment (e.g., Vercel Project Settings, Docker `.env`, or server environment):

### 1.1 Supabase Database & Authentication Configuration

```bash
# Public URL of your Supabase project (from Supabase Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public anonymous key for client-side browser requests (protected by RLS)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret service-role key for privileged server actions and admin provisioning
# CRITICAL: NEVER expose this key in client-side code or browser bundles!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 1.2 Nodemailer & SMTP Email Delivery Configuration

FoodBridge uses Nodemailer for transactional emails (password reset links, NGO approval notices, and critical expiry alerts).

```bash
# SMTP Server hostname (e.g., smtp.gmail.com for Google Workspace / Gmail App Passwords)
SMTP_HOST=smtp.gmail.com

# SMTP Port (587 for TLS/STARTTLS, 465 for SSL)
SMTP_PORT=587

# Enable TLS/SSL (false for 587 STARTTLS; true for 465 SSL)
SMTP_SECURE=false

# Authenticated SMTP user / sender address
SMTP_USER=your_email@example.com

# Authenticated SMTP password or Gmail 16-character App Password (NOT your login password)
SMTP_PASS=your_gmail_app_password
# Note: SMTP_PASSWORD is also supported as an alias

# Display From address header
SMTP_FROM=FoodBridge Alerts <your_email@example.com>
```

---

### 1.3 Application & Authentication URLs

```bash
# Canonical base URL of the deployed application (used for email redirects and OAuth)
APP_URL=https://foodbridge.example.com
NEXT_PUBLIC_APP_URL=https://foodbridge.example.com

# Optional port for portal test runner (defaults to 3001 if omitted)
PORTAL_TEST_URL=http://localhost:3000
```

---

## 2. Supabase Project Setup & Database Migrations

### 2.1 PostGIS Extension
FoodBridge utilizes PostGIS spatial coordinates for accurate geodesic proximity matching between food donors and NGOs. Ensure the PostGIS extension is active in your database:
```sql
create extension if not exists postgis;
create extension if not exists "uuid-ossp";
```

### 2.2 Schema & RLS Execution Order
1. Execute `database_setup.sql` in the Supabase SQL Editor or via Supabase CLI (`supabase db push`).
2. Run `supabase/migrations/00000000000001_rls_policies.sql` to apply security policies.
3. Seed baseline roles and test data:
   ```bash
   npm run seed:users
   ```

---

## 3. Google OAuth Configuration in Supabase

To enable real Google Sign-In on `/login`:
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Set **Authorized JavaScript origins**:
   `https://foodbridge.example.com` (and `http://localhost:3000` for development).
4. Set **Authorized redirect URIs**:
   `https://your-project.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret into **Supabase Dashboard** -> **Authentication** -> **Providers** -> **Google**, and toggle to **Enabled**.
6. In Supabase Dashboard -> **Authentication** -> **URL Configuration**, add:
   `https://foodbridge.example.com/api/auth/callback` to the **Redirect URLs** list.

---

## 4. Production Deployment Procedures

### 4.1 Deployment on Vercel
1. Connect the GitHub repository to Vercel.
2. Select Framework Preset: `Next.js`.
3. Add the environment variables from Section 1 above.
4. Set Build Command: `next build`.
5. Deploy.

### 4.2 Deployment with Node.js / Docker
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```
