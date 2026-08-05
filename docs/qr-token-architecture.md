# AFLEWO — QR Token Architecture & Migration Guide

This document defines the underlying cryptographic design, database schema, non-negotiables, collision mechanics, and future system migration paths for the AFLEWO Access Tier and QR Token system.

---

## 1. Overview & Architectural Goals

The AFLEWO QR System provides dynamic, fingerprintable, access-controlled QR codes for events, registrations, and resources across all AFLEWO chapters.

### Key Goals
1. **Opaque Payload:** The QR code encodes *nothing* decodable client-side — only a 22-character random lookup key (`token`).
2. **Stable Identity Fingerprint:** Users are tracked in analytics via `identity_fp = HMAC-SHA256(QR_SERVER_SECRET, user_id)` (base32, 16 bytes). Raw `user_id` is **never** exposed in QR codes, scans, or analytics logs.
3. **Instance Salting:** Regenerating a QR code for the same user and resource produces a brand new `token`, `issued_at`, and `expires_at`, while preserving the identical `identity_fp`.
4. **Single Source of Truth:** Tier resolution is handled by a single PostgreSQL function (`public.resolve_access_tier(uid)`).
5. **Runtime Isolation:** Generation and scanning run on the **Node.js runtime** in Next.js Route Handlers (`/api/qr/[resourceId]/route.ts` and `/api/qr/scan/route.ts`).

---

## 2. Non-Negotiable Launch Constraints

The following four parameters must **never** be changed after production tokens have been issued. Changing any of them invalidates or silently corrupts existing tokens:

| Parameter | Value | Rationale |
|---|---|---|
| `QR_SERVER_SECRET` | 32+ byte random secret string | Rotation invalidates all historical `identity_fp` joins in analytics. Treat rotation as a full migration event. |
| Token Entropy | 22-character Base62 | Provides ~131 bits of entropy. Prevents token enumeration and brute-force attacks. |
| `identity_fp` Truncation | 16 bytes (128 bits) base32 | Collision-safe across millions of users while remaining compact in indices. |
| Single-Use vs Reusable Policy | Stored per-token in `single_use` boolean | Allows resource types (e.g. single-use event door pass vs reusable file download) to behave differently without hardcoded branching. |

---

## 3. Database Schema Spec

### `qr_tokens` Table
```sql
CREATE TABLE public.qr_tokens (
  token          TEXT PRIMARY KEY,                  -- 22-char base62 random lookup key
  identity_fp    TEXT NOT NULL,                     -- HMAC-SHA256(QR_SERVER_SECRET, user_id), base32 (16 bytes)
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type  TEXT NOT NULL CHECK (resource_type IN ('chapter_registration', 'chapter_event', 'resource')),
  resource_id    UUID NOT NULL,
  tier_at_issue  access_tier NOT NULL,
  single_use     BOOLEAN NOT NULL DEFAULT TRUE,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ,                        -- NULL until scanned (for single-use tokens)
  scan_count     INT NOT NULL DEFAULT 0,
  schema_version SMALLINT NOT NULL DEFAULT 1        -- Explicit version for zero-downtime schema evolution
);
```

---

## 4. Cryptographic & Mathematical Soundness

### Birthday Bound & Collision Math
- `identity_fp` is truncated to 16 bytes (128 bits).
- According to the Birthday Paradox, the number of users $N$ required to achieve a 50% probability of a collision is approximately:
  $$N \approx \sqrt{2 \times 2^{128} \times \ln(2)} \approx 2^{64} \approx 1.84 \times 10^{19} \text{ users}$$
- Even with 1,000,000 active and historical members (since 2004), collision probability is less than $10^{-27}$. The 128-bit space is completely collision-safe at AFLEWO's scale.

### Instance Salting
- When a user requests a fresh QR code for the same resource, `identity_fp` remains constant (derived deterministically from `user_id` + `QR_SERVER_SECRET`), while `token` is freshly sampled from $62^{22}$ possibilities.
- This allows accurate per-instance interaction analytics (distinguishing a duplicate scan from a new QR request) while maintaining permanent pseudonymous user continuity.

---

## 5. System Migration & Future-Proofing Mechanics

If AFLEWO migrates to a new backend platform or authentication system in the future, user identity and analytics continuity can be preserved via two clean paths:

### Path A: Carry `user_id` Forward
If the future system preserves Supabase UUIDs (or migrates them 1-to-1):
1. Import `auth.users(id)` into the new database.
2. Maintain the same `QR_SERVER_SECRET` (or generate a new secret and create a one-time `old_identity_fp → new_identity_fp` mapping table).

### Path B: Treat `identity_fp` as Permanent Pseudonymous Key
If the future system uses completely new user IDs:
1. Treat existing `identity_fp` values as the immutable primary key in historical analytics.
2. Have the new system store a mapping table: `new_user_id → legacy_identity_fp`.

---

## 6. Known Open Gaps & Admin Maintenance Items

1. **Re-entry / Multiple Service Years:**
   - `profiles.year_joined` captures a person's *first* year.
   - If a member served in 2015, left, and returned in 2026, their initial `service_history` entry is 2015.
   - *Resolution:* Admins can insert additional `service_history` rows via the Supabase Admin Portal or admin dashboard tool when a member returns.

2. **Historical Backfill:**
   - Pre-2026 service history is not automatically backfilled from existing `profiles` rows (`role` only reflects current state).
   - *Resolution:* Run backfill scripts against historical spreadsheets to populate `service_history(user_id, year)` for alumni prior to 2026.

3. **Oct 2, 2026 Main Event Database Row:**
   - The Nairobi 2026 schedule in seed data needs the official `chapter_events` row inserted once venue and times are locked. Use the SQL template provided in `migration-access-tiers-qr.sql`.
