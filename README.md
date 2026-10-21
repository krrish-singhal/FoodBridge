# FoodBridge

FoodBridge is an intelligent surplus food redistribution platform connecting restaurants, hotels, and event organizers with verified NGOs to seamlessly redistribute surplus food before it expires.

## Architecture

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (FoodBridge Semantic Design System)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Notifications**: Centralized service (In-app, Email via Nodemailer, SMS via stub)

## Development

First, set up your environment variables based on `.env.example`.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Design System

The application uses a deliberate **GREEN + YELLOW** FoodBridge visual identity.
- Professional, clean, human, trustworthy, functional, modern, calm, efficient.
- No "AI-generated SaaS" visual style (no blobs, glassmorphism, floating cards, or excessive rounded pills).
- Accessible and responsive utility classes defined in `app/globals.css`.

## Notifications System

FoodBridge features a resilient multi-channel notification system implemented in `lib/notifications`.
- **Channels**: Realtime UI, Email (Nodemailer), SMS (Stubbed)
- **Idempotency**: Prevents duplicate notification delivery
- **Fault-Tolerance**: If email or SMS fails, the core operation (donating/matching) succeeds and logs the delivery error.

## Portal access for development

Run `npm run dev` and open `/login`. Existing development accounts use password `password123`:

| Portal | Email | Route |
| --- | --- | --- |
| Provider | provider@foodbridge.com | /provider/dashboard |
| NGO | ngo@foodbridge.com | /ngo/dashboard |
| Admin | admin@foodbridge.com | /admin/dashboard |
| CSR | csr@foodbridge.com | /csr/dashboard |

Use the profile dropdown in the portal header to view account details or sign out.

`npm run seed:users` provisions the development test accounts and repairs missing profiles/memberships for existing seed accounts.

### Automated Testing & Verification

With the app running, run:
```bash
npm run test:portals
```
This tests all portal accounts, profiles, dashboard rendering, redirects, role isolation, sign-out, and prevents role escalation.

To verify the end-to-end donation, matching, OTP, and pickup flow:
```bash
node scripts/test-donation-flow.mjs
```

### Vercel Deployment

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. Configure the environment variables in Vercel from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL)
   - `APP_URL` (set to your Vercel deployment URL)
   - `SMTP_*` (optional for email verification and notifications)
4. Deploy! Next.js will build all 28 static and dynamic routes.
