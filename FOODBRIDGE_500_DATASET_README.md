# FoodBridge — 500 Synthetic Indian Users Dataset

This dataset is synthetic test data for FoodBridge. It is intentionally designed
to look operationally realistic without using real people's personal information.

## Composition
- 500 users total
- 310 Provider users
- 180 Organisation/NGO users
- 8 Admin users
- 2 CSR/read-only stakeholder users
- All 36 Indian States/UTs are represented.
- Dates range from 2025-01-15 through 2026-10-02.
- Coordinates are approximate city-level test coordinates with small synthetic jitter.
- Emails use `@foodbridge.test`.
- Phone numbers are synthetic and should never be treated as real contact numbers.

## Provider types
Restaurants, hotels, hostels, caterers, event/party organizers, and individual food donors.

## NGO data
NGOs have synthetic capacity, pickup radius, food preferences, operating hours,
availability, verification state, and reliability scores so the matching engine
can be exercised.

## Important
Do not import this CSV blindly into Supabase Auth. The `email` values are safe
test identifiers, but passwords/auth identities should be created using the
project's supported Supabase Auth seeding mechanism.

Map the CSV columns to the project's actual schema rather than changing the
existing production schema merely to fit this file.
