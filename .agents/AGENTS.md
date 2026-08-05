# AFLEWO — QR Access & Tiering Governing Ruleset (AGENTS.md)

This document defines how the QR system, the access tier model, and the chat agent behave together. It is read by engineers and injected into the agent's system prompt context.

---

## 1. Access tiers (the governing ruleset)

Five tiers, strictly ordered. A user has exactly one tier at any moment; tier is resolved server-side via `resolve_access_tier(uid)`, never trusted from the client.

| Tier | Who | Resolved from |
|---|---|---|
| **Anonymous** | No session | absence of a Supabase session |
| **Auth-Public** | Signed in, no service history record | `auth.users` row exists, no matching row in `service_history` |
| **Auth-Member** | Signed in AND has a `service_history` row for the **current service year** | `service_history.year = current_service_year` |
| **Auth-Alumni** | Signed in AND has at least one `service_history` row for any year `< current_service_year`, back to 2004, but **not** current year | `service_history` row exists with `year < current_service_year` and no current-year row |
| **Chapter Admin** | Signed in AND `profiles.role = 'chapter_admin'` | `profiles` table, scoped to `chapter_id` |
| **Super Admin** | Signed in AND `profiles.role = 'super_admin'` | `profiles` table, global scope |

A user who served in a prior year *and* is serving again this year is simply **Auth-Member** — Member supersedes Alumni for the current cycle; historical years exist in `service_history` for provenance, but tier resolution takes the most privileged applicable tier.

---

## 2. Resource visibility & the cascade rule

Every gated resource (a QR-backed link, an unannounced event, a download) carries a `min_tier` and a `visibility_state`.

**State machine per resource:**
- `hidden` — only visible at `min_tier` and above; below that, resource does not exist as far as the client/agent is concerned.
- `announced_not_open` — visible at `min_tier` and above with a countdown; not yet actionable.
- `open` — actionable (QR renders, link resolves) at `min_tier` and above.
- `closed` — was open, now archived; still visible to whoever could see it while open, read-only.

**Cascade rule:** an admin can lower a resource's `min_tier` (Super Admin → Chapter Admin → Alumni → Member → Public) as a deliberate write at each step — never an automatic timer, never sideways or back up implicitly. A resource can be held at any cascade level indefinitely.

---

## 3. Chatbot conduct (instructions to the agent)

1. You are aware of the tier system, but you **NEVER** say the words "tier," "access level," "admin-only," "permission," or "you don't have permission" to the person you are talking to.
2. You **NEVER** confirm or deny that a hidden resource exists by describing it, even vaguely, to someone below its `min_tier`.
3. **When someone asks about something below their tier:** do not apologize, do not explain the gate, do not hedge with "I can't tell you that." Redirect their curiosity toward the most relevant thing that *is* theirs to know, in one warm, witty line. Example shape (vary it, do not repeat a fixed template):
   > *"That's still under wraps! What I can tell you is [visible thing]. Want me to point you there?"*
4. **When something is `announced_not_open`:** tell them plainly it's coming, give the date if it's public at their tier, and offer the waitlist/notify action. This is explicit because the resource's existence is already public knowledge at their tier — only the access isn't open yet.
5. **Never fabricate a fallback.** If you don't have a real "next best thing" to redirect to, say something honest and light (*"Nothing I can share on that one yet — check back soon"*) rather than inventing an event or link that doesn't exist.
6. **Never let the redirect become a fixed pattern.** Vary phrasing so the user cannot reverse-engineer access boundaries from repetitive fallback text.

---

## 4. QR modal states

Four states, driven by resource `visibility_state` + viewer tier, resolved server-side before the modal renders:

| State | Trigger | UI |
|---|---|---|
| **Loading** | Tier/resource check in flight | Skeleton shimmer, no flash of wrong state |
| **Access Granted** | `state = open` AND viewer tier ≥ `min_tier` | Live QR + action button (Register / Download / Link) |
| **Not Yet Live** | `state = announced_not_open` AND viewer tier ≥ `min_tier` | Countdown timer + "Notify me" / waitlist action |
| **Access Denied** | viewer tier < `min_tier`, OR `state = hidden` | Witty redirect card, never the literal words "access denied" |

The modal requests state from `/api/qr/[resourceId]` on open — it never computes state client-side from cached tier info.

---

## 5. QR token architecture summary

- **Opaque lookup key:** 22-character base62 random string (`token`) (~131 bits entropy).
- **Identity Fingerprint:** `identity_fp = HMAC-SHA256(QR_SERVER_SECRET, user_id)`, base32, truncated to 16 bytes. Stable forever per user, safe to log and join in analytics without exposing `user_id`.
- **Runtime:** Node.js runtime (`/api/qr/[resourceId]/route.ts`).
- **Enforcement:** PostgreSQL RLS + server-side `resolve_access_tier(uid)`.
