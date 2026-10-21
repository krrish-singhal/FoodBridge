# FoodBridge — SRS Traceability Matrix (REQ-1 to REQ-37)

**Document Version:** 2.0  
**Specification:** FoodBridge Software Requirements Specification (SRS)  
**Status:** 100% PASS (All 37 Requirements Verified Against Production Implementation)

---

## Requirements Verification Matrix

| Req ID | Requirement Title | Target Portal / Actor | Implementation File(s) & Routes | Database Table(s) | Verification Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **REQ-1** | Role-Based Authentication | Public / All | `app/(auth)/login/page.tsx`<br>`app/(auth)/register/page.tsx` | `auth.users`, `profiles` | Tested via `check-portals.mjs`: session creation, redirect by role, password validation. | **PASS** |
| **REQ-2** | Strict RBAC Enforcement | All | `lib/supabase/middleware.ts`<br>`lib/auth/getUser.ts` | `profiles.role`<br>`auth.users.app_metadata` | Tested role escalation prevention; client-supplied `user_metadata` cannot grant elevated roles. | **PASS** |
| **REQ-3** | Organization Profiles | Provider & NGO | `app/(provider)/provider/settings/page.tsx`<br>`app/(ngo)/ngo/settings/page.tsx` | `organizations`, `organization_members` | Profile update server actions persist name, capacity, contact, and address. | **PASS** |
| **REQ-4** | Organization Verification | Admin | `app/(admin)/admin/verifications/page.tsx`<br>`app/(admin)/admin/verifications/actions.ts` | `organizations.verification_status` | Admin review, one-click approval, and auto-provisioning of Auth accounts. | **PASS** |
| **REQ-5** | Operating Preferences & Radius | Provider & NGO | `app/(ngo)/ngo/settings/page.tsx` | `organizations.operating_radius_km`<br>`organizations.capacity_meals` | Preferences enforced dynamically by matching engine during candidate filtering. | **PASS** |
| **REQ-6** | Create Surplus Food Donation | Provider | `app/(provider)/provider/donations/new/page.tsx`<br>`app/(provider)/provider/donations/new/actions.ts` | `donations` | Form collects quantity, meals estimate, expiry, and coordinates; persists to `donations`. | **PASS** |
| **REQ-7** | Donation Categories | Provider / Admin | `app/(provider)/provider/donations/new/page.tsx` | `donation_categories` | Real categories loaded from database (Cooked Food, Produce, Dairy, Bakery, etc.). | **PASS** |
| **REQ-8** | Donation Lifecycle State Machine | System | `types/database.ts`<br>`app/(provider)/provider/donations/[id]/actions.ts` | `donations.status` | State progression: `AVAILABLE -> MATCHED -> PICKUP_SCHEDULED -> PICKED_UP -> DELIVERED -> DISTRIBUTED`. | **PASS** |
| **REQ-9** | Donation History & Search | Provider | `app/(provider)/provider/donations/page.tsx` | `donations` | Paginated listing with search, status filters, and public ID tracking (`FB-DON-XXXXXX`). | **PASS** |
| **REQ-10** | Recurring Donations | Provider / Worker | `app/api/cron/recurring/route.ts` | `recurring_donations` | Recurrence rules scheduled and executed through cron endpoint. | **PASS** |
| **REQ-11** | Intelligent Candidate Matching | Backend Engine | `lib/matching/matching.service.ts` | `organizations`, `donations` | Geodesic Haversine calculation, NGO radius filtering, and transit feasibility check. | **PASS** |
| **REQ-12** | Matching Score & Reliability | Backend Engine | `lib/matching/matching.service.ts` | `matches.score`, `reliability_scores` | Weighted ranking combining proximity (40%), urgency (30%), capacity (20%), and reliability (10%). | **PASS** |
| **REQ-13** | Time-to-Expiry Urgency | Backend Engine | `lib/matching/matching.service.ts` | `donations.consume_before` | Matches rejected if NGO cannot reasonably collect food before expiry window. | **PASS** |
| **REQ-14** | Automated Match Generation | System | `app/(provider)/provider/donations/new/actions.ts` | `matches` | Triggered immediately on donation creation; notifies top 3 candidate NGOs. | **PASS** |
| **REQ-15** | NGO Decision & Request Submission | NGO | `app/(ngo)/ngo/donations/page.tsx`<br>`app/(ngo)/ngo/donations/MatchActions.tsx` | `matches.status` | NGO reviews feasibility, submits request with pickup note, or declines candidate match. | **PASS** |
| **REQ-16** | Pickup Scheduling & Logistics | Provider & NGO | `app/(ngo)/ngo/pickups/page.tsx`<br>`app/(ngo)/ngo/pickups/actions.ts` | `pickups.scheduled_time` | Stores responsible pickup person name, contact phone, and estimated pickup window. | **PASS** |
| **REQ-17** | Pickup Coordination Feed | Provider & NGO | `app/(provider)/provider/pickups/page.tsx`<br>`app/(ngo)/ngo/pickups/page.tsx` | `pickups` | Dedicated views for pickup logistics with real-time status badges and action triggers. | **PASS** |
| **REQ-18** | 6-Digit Verification OTP | Provider & NGO | `app/(ngo)/ngo/pickups/actions.ts`<br>`app/(provider)/provider/pickups/actions.ts` | `pickup_otp` | 6-digit cryptographic code; 5-attempt rate limit; atomic verification and invalidation. | **PASS** |
| **REQ-19** | Proof of Handover & Notes | Provider | `app/(provider)/provider/pickups/ProviderPickupActions.tsx` | `pickup_proof`, `audit_logs` | Handover confirmation records timestamp, condition notes, and verifying user. | **PASS** |
| **REQ-20** | Delivery & Distribution Milestones | NGO | `app/(ngo)/ngo/pickups/NgoPickupActions.tsx`<br>`app/(ngo)/ngo/pickups/actions.ts` | `pickups.status`, `donations.status` | NGO advances delivery milestones (`PICKED_UP -> DELIVERED -> DISTRIBUTED`) with audit logging. | **PASS** |
| **REQ-21** | Failed Pickup & Auto-Rematching | Provider / System | `app/(provider)/provider/pickups/actions.ts` | `pickups`, `matches` | On pickup failure, records failure reason and automatically triggers rematching to next NGO. | **PASS** |
| **REQ-22** | Expiry Tracking Worker | Background Cron | `app/api/cron/expiry/route.ts` | `donations.status` | Queries unassigned listings past `consume_before`, sets `EXPIRED`, updates active matches. | **PASS** |
| **REQ-23** | Automated Notification Engine | All Actors | `lib/notifications/notification.service.ts` | `notifications` | Persisted database notifications with in-app real-time broadcasts. | **PASS** |
| **REQ-24** | Food Safety Checklist | Provider | `app/(provider)/provider/donations/new/actions.ts` | `donation_safety_checklists` | Mandatory verification of proper storage, packaging, and temperature control. | **PASS** |
| **REQ-25** | Allergen Declarations | Provider | `app/(provider)/provider/donations/new/actions.ts` | `donation_allergens` | Persists multiple allergen tags (Dairy, Nuts, Gluten, Soy, etc.) linked to donation. | **PASS** |
| **REQ-26** | Real-Time UI Notification Updates | All Actors | `components/NotificationBell.tsx` | `notifications` | Live unread badge count and notification dropdown via Supabase channel subscription. | **PASS** |
| **REQ-27** | Notification Preferences | Provider & NGO | `app/(provider)/provider/settings/page.tsx` | `notification_preferences` | Toggle in-app and email notification channels per user. | **PASS** |
| **REQ-28** | In-App Real-Time Messaging | Provider & NGO | `components/chat/ChatInterface.tsx`<br>`app/actions/chat.ts` | `conversations`, `messages` | Match-linked messaging channel with instant message broadcast and polling fallback. | **PASS** |
| **REQ-29** | Critical Expiry Alerts | System | `app/(provider)/provider/dashboard/page.tsx` | `donations` | Dashboard surfaces urgent alerts for listings expiring within 3 hours. | **PASS** |
| **REQ-30** | Provider Operations Dashboard | Provider | `app/(provider)/provider/dashboard/page.tsx`<br>`ProviderDashboardCharts.tsx` | `donations`, `matches`, `pickups` | Fully data-driven; meals rescued, weight in kg, animated area charts, donut status graphs. | **PASS** |
| **REQ-31** | NGO Coordination Dashboard | NGO | `app/(ngo)/ngo/dashboard/page.tsx` | `matches`, `pickups`, `donations` | Live active matches, available food feed, and upcoming pickup tasks. | **PASS** |
| **REQ-32** | Admin Platform Overview | Admin | `app/(admin)/admin/dashboard/page.tsx` | `profiles`, `organizations`, `donations` | Real-time counts of users, verifications, active listings, and platform metrics. | **PASS** |
| **REQ-33** | Public Impact Transparency Dashboard | Public | `app/impact/page.tsx` | `donations`, `organizations` | Publicly verifiable metrics: total meals rescued, CO2 avoided, and active partners. | **PASS** |
| **REQ-34** | Custom Reports & CSV Exports | Admin | `app/(admin)/admin/reports/ReportsDashboard.tsx` | `donations`, `pickups` | Interactive reports with date range filtering, breakdown charts, and CSV data export. | **PASS** |
| **REQ-35** | Mutual Ratings & Feedback | Provider & NGO | `app/actions/ratings.ts`<br>`components/RatingModal.tsx` | `ratings` | Post-handover 1-5 star reviews with idempotency guard (`unique(match_id, reviewer_org_id)`). | **PASS** |
| **REQ-36** | Happy Score & Reliability Engine | Provider & NGO | `lib/analytics/happy-score.ts` | `reliability_scores` | Deterministic 0-100 score evaluating base standing, volume, safety, and fulfillment rate. | **PASS** |
| **REQ-37** | Leaderboards & Impact Rankings | Public / Admin | `app/impact/page.tsx`<br>`app/(admin)/admin/reports/ReportsDashboard.tsx` | `donations`, `organizations` | Top donor and NGO impact rankings derived from verified completed distributions. | **PASS** |

---

## Conclusion
All 37 Software Requirements Specifications (REQ-1 through REQ-37) are fully implemented, connected to the Supabase database, and verified in both automated scripts and end-to-end user workflows.
