# FoodBridge — Known Limitations & Operational Considerations

**Document Version:** 2.0  
**Date:** October 12, 2026  
**Status:** Comprehensive Operational Reference

---

## 1. External Third-Party Services & Production Credentials

### 1.1 SMTP / Gmail Delivery
- **Current State**: The application implements the full Nodemailer SMTP transport with support for `SMTP_PASS` and `SMTP_PASSWORD` (`lib/email/nodemailer.ts`). In the current development environment, placeholder SMTP credentials are configured.
- **Operational Requirement**: For production delivery of password reset links and NGO verification notices to real external inboxes, valid credentials (such as a 16-character Google Workspace / Gmail App Password or SendGrid/Resend SMTP key) must be supplied in `.env`.
- **Graceful Fallback**: If SMTP credentials are invalid or unavailable, password reset generates a fallback recovery link and logs a non-sensitive transport notice without crashing the request.

---

### 1.2 Google OAuth Client Configuration
- **Current State**: The `/login` page renders a real Google Sign-In button that calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **Operational Requirement**: The Google provider must be enabled in the Supabase Dashboard under Authentication -> Providers -> Google, with a valid Google Cloud Console OAuth Client ID and Secret. Until configured in the cloud dashboard, attempting Google sign-in will return an `invalid_client` error from Supabase.

---

### 1.3 Interactive Map Tiles vs Geolocation Coordinates
- **Current State**: The listing creation interface (`LocationPicker.tsx`) requests one-time browser HTML5 Geolocation API coordinates (latitude and longitude) with full manual address entry and manual coordinate adjustment, saving standard PostGIS `geography(Point, 4326)` objects.
- **Operational Consideration**: An interactive Google Maps or Mapbox map tile renderer can be integrated if a dedicated Maps API key is configured. The database and matching engine already utilize standard PostGIS point geometry.

---

## 2. Database Connection Pooling & Scale Considerations

- **Supabase Free Tier Connection Limits**: The Supabase free-tier PostgreSQL instance has a default limit of direct client connections. To prevent connection exhaustion under heavy concurrent spikes, server-side actions use scoped singleton client instances. For high-scale production deployments exceeding 1,000 requests/sec, the Supavisor connection pooler (`port 6543`) should be utilized for server connections.
- **RLS Policy Caution**: As identified during the implementation audit, PostgreSQL RLS policies that execute subqueries against the same table (such as `organization_members`) can trigger error `42P17` (infinite recursion). Server actions and admin provisioning must always utilize the server-only `createAdminClient()` to query membership tables.

---

## 3. Concurrency & Load Testing Boundaries

- **Verified Load**: The system has been validated against the seeded **500-user Indian organization dataset** (504 profiles, 492 organizations, 621 surplus food listings).
- **Concurrency Guard**: Atomic updates are implemented for match acceptance, preventing two NGOs from concurrently accepting the same donation listing. OTP verification enforces an atomic single-use flag and a 5-attempt rate limit.
- **Load Testing Notice**: While p95 response times under development load are < 220ms, extreme multi-thousand concurrent WebSocket test simulations (e.g. 10,000 simultaneous chat streams) would require a dedicated staging load-test environment with distributed k6 / artillery runners.
