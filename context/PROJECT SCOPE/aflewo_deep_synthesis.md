# AFLEWO - Deep Stack Synthesis & Execution Roadmap
**Built from: full conversation context + production audit + Nasaka precedent data**
**Mode: EXPLAIN ONLY | Date: July 2026**

---

## 0. The Single Most Important Correction First

> **Vercel Pro is NOT required for raw capacity.** The Nasaka IEBC precedent (1.8–2.3M requests / 72hrs / 10–30k users on Vercel Hobby) proves the serverless layer auto-scales fine. AFLEWO Night's ~100–190 req/sec peak for ~90 seconds is *smaller* than what Nasaka already handled.

The audit's original "Vercel Pro = CRITICAL" call was wrong on the capacity argument. Here is what it *is* valid for:

| Reason to upgrade Vercel Pro | Valid? |
|---|---|
| Raw capacity / surviving 7k users | ❌ Cloudflare + Vercel Hobby already handles this (Nasaka proof) |
| Bandwidth cost | ❌ Cloudflare absorbs egress; you're not paying for bandwidth either way |
| ToS / commercial-use policy risk | ✅ AFLEWO is an organization, not a personal project. Hobby ToS is ambiguous here |
| Concurrent serverless function execution limits on POST writes | ✅ Partially valid for the 90-second thundering-herd window - but client-side jitter (random 0–3s delay on check-in button) eliminates this at zero cost |
| Vercel Analytics + team features | ✅ If you want the dashboard |

**Verdict:** Vercel Pro ($20/mo) is a *policy protection* buy, not a capacity buy. You can defer it, but you should make a deliberate decision before the next public event rather than discovering the ToS issue when your deployment gets flagged.

---

## 1. Best Pick Per Category - One Clear Recommendation Each

| Category | Pick | One-Line Reason |
|---|---|---|
| **Frontend hosting** | Vercel Hobby (now) → Pro before first major public event | Nasaka proved Hobby handles the load; Pro is a ToS insurance policy |
| **Edge / CDN** | Cloudflare $5 plan (already) | Best value on earth; zero egress; already paid; write Cache Rules for static AFLEWO pages now |
| **Database** | Supabase Pro + bump compute 48hrs before events | Same pattern that worked for Nasaka; don't add a Read Replica until you have a slow-query problem to solve |
| **Connection pooling** | PgBouncer transaction mode (already in Supabase) | Confirm `pgbouncer=true` is in your connection string - free fix, maximum impact |
| **Auth** | Supabase Auth (stay) | RLS is now fixed and deeply integrated; switching would cost weeks of engineering time |
| **Media storage** | Cloudflare R2 as primary, Supabase Storage for RLS-gated member files | Zero egress on R2 means event-night PDF/audio downloads cost nothing extra |
| **Image transforms** | Cloudflare Images (included in $5 plan) | Already paying for it; replace Cloudinary dependency entirely and save $89/mo when you hit that tier |
| **Email** | Brevo (stay on free tier) | 300/day covers auth emails fine; upgrade to $9/mo Starter if you add bulk announcements |
| **SMS / attendance fallback** | Africa's Talking | Only provider with direct Safaricom/Airtel integration; ~$0.03/SMS, pay-as-you-go |
| **Error tracking** | Sentry free tier | 5k errors/mo is more than enough; one afternoon to integrate; free |
| **Uptime monitoring** | BetterStack free tier | Pings every 60 seconds; texts you if site goes down; free; 15-minute setup |
| **Rate limiting** | Cloudflare WAF rules (already paying) | Write two rules: throttle `/api/auth/*` and `/api/attendance/*`; zero cost; protects against abuse at doors-open |
| **Attendance system** | QR code + Admin manual override hybrid | As discussed - both paths write to the same DB table; no single point of failure |
| **Load testing** | k6.io (free, open-source) | Simulate 500 concurrent check-ins before any major event; run from GitHub Actions |
| **CI/CD** | Vercel Git integration (stay) + add a staging branch | Create a `staging` Vercel project on Supabase free tier; prevents pushing broken code to 10k users |

---

## 2a. Three Cost Tiers - Cash + Labour

### Tier 1 - "Minimum Viable Production" (~$39/mo)
**What you have right now, hardened.**

| Item | Monthly Cost |
|---|---|
| Supabase Pro + compute add-on | $34 |
| Cloudflare Workers $5 plan | $5 |
| Vercel Hobby | $0 |
| Brevo (email) | $0 |
| Sentry free | $0 |
| BetterStack free | $0 |
| Africa's Talking (SMS) | ~$0 (pay-per-use, negligible at current scale) |
| **Total** | **~$39/mo** |

**Labour to reach this tier from current state:** ~6–8 hours
- 1hr: Cloudflare DNS for aflewo.saemstunes.com + orange cloud
- 1hr: Sentry integration in Next.js (`npm install @sentry/nextjs`, 3 config lines)
- 30min: BetterStack uptime monitors
- 2hrs: Cloudflare WAF rules for auth + attendance rate limiting
- 2hrs: Write and deploy Cloudflare Cache Rules for static AFLEWO pages
- 1hr: Verify PgBouncer transaction mode in connection strings

**What you get:** A system that won't silently fail, with monitoring, rate limiting, and proper DNS. Vercel ToS risk remains as the known open issue.

---

### Tier 2 - "Event-Ready Production" (~$64–84/mo base, +$20 during event months)

| Item | Monthly Cost |
|---|---|
| Everything in Tier 1 | $39 |
| Vercel Pro | +$20 |
| Africa's Talking SMS credits (active use) | +$5–10 |
| Supabase compute bump (event months only) | +$20 for that month |
| **Base total** | **~$64/mo** |
| **Event month total** | **~$84/mo** |

**Labour to reach this tier from Tier 1:** ~12–15 additional hours
- 3hrs: Build attendance QR check-in system (backend DB + admin kiosk view)
- 3hrs: Africa's Talking SMS integration for PIN fallback attendance
- 2hrs: R2 bucket setup + migrate gallery_images to serve from R2 via Cloudflare
- 2hrs: Staging environment (new Vercel project + Supabase free project)
- 2hrs: k6 load test script for attendance endpoint
- 1hr: Supabase pre-scale SOP document (so you know exactly what to click 48hrs before an event)

**What you get:** A system you can run a 10,000-person event on with confidence.

---

### Tier 3 - "Institutional Scale" ($150–500+/mo, different conversation entirely)

This tier only makes sense when:
- AFLEWO has chapters across multiple countries (East Africa expansion)
- Member count exceeds 50,000 active users
- A dedicated technical team member joins AFLEWO staff

| Item | Monthly Cost (est.) |
|---|---|
| Vercel Pro (or enterprise) | $20–150 |
| Supabase Pro + Read Replica + higher compute | $75–150 |
| Cloudflare (current $5 plan likely sufficient still) | $5 |
| Dedicated monitoring (Datadog or Grafana Cloud) | $30–50 |
| Multi-region R2 + video streaming (Bunny or Cloudflare Stream) | $20–50 |
| Mobile app (React Native / Expo) - build cost, not hosting | One-time ~$10–20k build or 3–6 months engineering time |
| **Total** | **$150–500/mo ongoing** |

**You are not here yet. Don't spend time on this tier.**

---

## 2b. What You Need to Know - Literacy Map

### Already In Your Toolkit (Proven in this codebase)
- Next.js App Router, Supabase Auth, RLS policies
- Vercel deployment, Cloudflare DNS + proxy
- TypeScript, React, Tailwind/custom CSS
- Supabase PostgreSQL - queries, migrations, RLS
- SECURITY DEFINER functions (fixed this session)
- Brevo email integration
- Cloudinary (image handling)
- pg_cron for scheduled DB jobs
- Soft-delete patterns, audit logging

### Genuinely New - Things You'll Need to Learn/Build
| Tool/Concept | Learning Curve | Why You Need It |
|---|---|---|
| **k6.io** | 2–3 hours | Open-source load testing; write a JS script that simulates 500 users hitting your check-in endpoint |
| **Cloudflare WAF syntax** | 1–2 hours | The rule language is simple (firewall expression editor in dashboard) but you need to know the field names |
| **Cloudflare Cache Rules** | 1 hour | Different from Page Rules; the new UI system for defining what gets cached |
| **Africa's Talking SDK** | 2–3 hours | Node.js SDK, straightforward; send an SMS in one function call |
| **Sentry Next.js integration** | 1 hour | `npx @sentry/wizard@latest -i nextjs` - mostly automated |
| **EXPLAIN ANALYZE** (PostgreSQL) | 2–4 hours | The tool for understanding why a query is slow; you'll need this when PgBouncer starts logging slow queries under load |
| **QR code generation** (client-side) | 2–3 hours | Libraries: `qrcode.react` or `react-qr-code`; generate from member UUID, cache as static image |
| **Optimistic UI pattern** | 1–2 hours | Show "Checked in!" before the DB write confirms; React state trick that eliminates perceived latency |
| **Client-side jitter** | 30 minutes | Add `Math.random() * 3000` delay before firing check-in POST; desynchronizes the thundering herd |

### Non-Technical Literacy Gaps - Context You Need, Not Code
| Domain | What You Need to Know |
|---|---|
| **Kenya Data Protection Act 2019** | AFLEWO collects PII (names, phones, attendance history) - you need a Privacy Notice with retention policy, a right-to-erasure mechanism, and likely ODPC registration if you exceed ~5,000 records |
| **Incident Response Process** | What do you do at 8:45 PM on event night when the site is down? You need a written runbook: who to call, what to check first (Cloudflare status → Vercel status → Supabase status), how to communicate to members |
| **Forex / USD billing** | All your tools bill in USD. If your card is KES-denominated, you're paying forex conversion fees + potential card declines. Consider a USD virtual card (e.g., Chipper Cash, Flutterwave, or a Wise USD account) |

---

## 2c. Honest Preparedness Assessment

**Technically: ~70% ready.**
The core product works. Auth is fixed, RLS is solid, routing is clean, the Saem's Tunes bridge is live. What's missing is almost entirely infrastructure hygiene (monitoring, caching, WAF rules) - not product features. These are 1-hour tasks each, not architecture rewrites.

**Operationally: ~40% ready.**
This is the real gap, and it exists for a specific reason: nothing has *forced* the operational discipline yet. The site has been in a build-and-fix mode (which is appropriate for early-stage development), but you haven't had a "AFLEWO Night with 7,000 people" moment yet to make the operational gaps feel urgent. They will feel very urgent when they happen.

The gap is specifically:
- No monitoring → you don't know the site is struggling until someone texts you
- No load test → you don't know where it breaks until it breaks in front of 7,000 people
- No runbook → when something breaks, you're problem-solving from scratch under pressure
- No staged deploy process → a bad commit can go live to all 10,000 members instantly

**Your track record from this codebase:** You move fast, ship real features, and debug under pressure well (fixing the RLS infinite recursion live is a good example). The pattern is strong at *fix-after-it-breaks*, and the gap is *simulate-before-it-happens*. Adding k6 load testing and BetterStack monitoring closes most of that gap in one afternoon.

---

## 3. Seven Questions You Hadn't Been Asked

### Q1: Legal Entity Status
**Question:** Is AFLEWO a registered legal entity (NGO, CBO, trust, limited company), and in whose personal name are all the service contracts (Vercel, Supabase, Cloudflare) currently held?

**Why it matters:** If everything is under your personal email and credit card, and you become unavailable (travel, health, life), the entire platform's billing, access, and continuity is inaccessible. Every vendor account should have an `admin@aflewo.org` organizational email as the primary owner, with your personal account as a secondary member. This is a 30-minute fix per vendor, not a technical problem.

---

### Q2: Bus-Factor Risk
**Question:** If you were unavailable for 2 weeks tomorrow, who can: push a hotfix to Vercel, reset a Supabase password, manage a Cloudflare WAF rule, or communicate with members about a site outage?

**Why it matters:** Right now the answer is probably "nobody." For a platform serving 10,000+ members, this is the highest single point of failure - not a technical one. At minimum, one other trusted person (a co-admin or chapter tech lead) needs read-only access to Vercel, Supabase dashboard, and Cloudflare. Write access for emergencies comes later.

---

### Q3: USD Billing / Forex Friction
**Question:** Are all your USD-denominated subscriptions (Vercel, Supabase, Cloudflare) billing successfully and consistently each month, or are you absorbing forex conversion costs on a KES card?

**Why it matters:** A billing failure at 6 PM on AFLEWO Night (card declined due to forex limits, or Safaricom's international transaction blocking) could suspend your Supabase project within hours. A USD virtual card (Wise, Grey, or Chipper Cash) eliminates this risk entirely and often saves 2–5% on every bill.

---

### Q4: Trademark / Brand Protection
**Question:** Is "AFLEWO" trademark-protected in Kenya or across East Africa?

**Why it matters:** As the platform grows to 10,000+ members with a public-facing web presence, the brand becomes valuable. A competitor or bad actor could register the name. This is a Kenya Intellectual Property Institute (KIPI) conversation, not a technical one - but it's worth asking the leadership team now rather than in 3 years.

---

### Q5: Venue-Side Connectivity Failure (Not Server-Side)
**Question:** What happens to attendance check-in if the venue's WiFi/mobile data is overwhelmed or non-existent on event night?

**Why it matters:** Your servers can be perfectly healthy, but if 7,000 people are sharing one router in a church hall, nobody can connect. This is the scenario where the offline-first attendance fallback matters most: the admin's kiosk device should cache the full member roster locally (IndexedDB or service worker) so manual check-in works without any internet connection, and syncs when connectivity returns. This is a product decision, not a hosting decision.

---

### Q6: Content Rights on Testimonies & Event Media
**Question:** When a member submits a testimony, photo, or video through the AFLEWO platform, who legally owns that content, and do your Terms of Service explicitly grant AFLEWO a license to store, display, and archive it?

**Why it matters:** Without an explicit content license in your ToS, members could legally demand removal of any uploaded content (including event archives). This is a one-paragraph legal addition to your Terms page, not a technical problem - but it needs to be there before you build the testimony/media upload feature.

---

### Q7: Continuity Plan If You're Unavailable
**Question:** Is there a written continuity plan - even one page - covering what AFLEWO's leadership does if the primary technical person is unavailable during an event or for an extended period?

**Why it matters:** Technology is now core infrastructure for AFLEWO (attendance, resources, communication, archive). A key-person dependency on technical operations is a governance risk. The plan doesn't need to be complex: "Contact [name] → they have access to X, Y, Z credentials in [password manager / secure document]."

---

## 4. Prioritized Actionable Next Steps

Ordered by impact-per-hour. Do the top items first.

### 🔴 IMMEDIATE (Before ANY major public event - total ~8 hours)

| # | Action | Time | Cost |
|---|---|---|---|
| 1 | **Wire aflewo.saemstunes.com DNS in Cloudflare** - CNAME to Vercel, orange cloud, verify SSL | 30 min | $0 |
| 2 | **Install BetterStack** - add uptime monitor for aflewo.saemstunes.com, set SMS/email alert | 30 min | $0 |
| 3 | **Install Sentry** in AFLEWO Next.js - `npx @sentry/wizard -i nextjs`, wrap root layout | 1 hr | $0 |
| 4 | **Write 2 Cloudflare WAF Rate Limit rules** - throttle `/api/auth/*` (10 req/min) and `/api/attendance/*` (5 req/min per IP) | 1 hr | $0 |
| 5 | **Write Cloudflare Cache Rules** - cache `/media`, `/chapters`, `/schedule`, `/` for anonymous users | 1 hr | $0 |
| 6 | **Verify PgBouncer transaction mode** - check Supabase connection string includes `pgbouncer=true&connection_limit=1` | 30 min | $0 |
| 7 | **Add org email as primary owner** on Vercel, Supabase, Cloudflare - move personal email to secondary | 1 hr | $0 |
| 8 | **Add one trusted co-admin** to Vercel (read + deploy), Supabase (read), Cloudflare (read) | 30 min | $0 |
| 9 | **Get a USD virtual card** (Wise or Grey) and update billing on all three vendors | 1 hr | $0 |
| 10 | **Decide on Vercel ToS** - either upgrade to Pro ($20/mo) or document the risk and accept it consciously | 10 min | $0 or $20/mo |

---

### 🟠 HIGH PRIORITY (Before first large-scale event - additional ~15 hours)

| # | Action | Time | Cost |
|---|---|---|---|
| 11 | **Build attendance QR check-in system** - member QR display page (offline-cacheable) + admin kiosk scan/manual mark view | 4–6 hrs | $0 |
| 12 | **Add client-side jitter** to check-in button (0–3s random delay before POST fires) | 30 min | $0 |
| 13 | **Implement optimistic UI** on check-in - show success immediately, write to DB async | 1–2 hrs | $0 |
| 14 | **Write k6 load test script** - simulate 500 concurrent check-ins, run against staging | 2–3 hrs | $0 |
| 15 | **Create staging environment** - new Vercel project + Supabase free project, staging branch | 2 hrs | $0 |
| 16 | **Migrate gallery_images to serve from R2** via Cloudflare CDN instead of Supabase Storage | 2–3 hrs | ~$0.015/GB |
| 17 | **Write the 1-page incident runbook** - what to check first, who to call, how to communicate to members | 1 hr | $0 |
| 18 | **Add 2 paragraphs to Terms of Service** - content license grant for uploaded testimonies/media | 30 min | $0 |

---

### 🟡 MEDIUM TERM (12-month horizon)

| # | Action | Context |
|---|---|---|
| 19 | Africa's Talking SMS integration for attendance PIN fallback | ~3 hrs build, ~$5/mo usage |
| 20 | PWA / service worker for offline QR code display | Eliminates venue-connectivity failure for check-in |
| 21 | Chapter admin dashboard with attendance analytics scoped to their chapter | Part of the attendance_admin role build |
| 22 | Kenya DPA / ODPC registration and privacy policy update | Legal, not technical |
| 23 | Pre-event Supabase compute upgrade SOP | Document the 5-click process so anyone can do it |

---

## 5. The Three Follow-Up Deliverables Worth Building

| Deliverable | What it is | Build time |
|---|---|---|
| **Incident Runbook** | A 1-page document: what to check first when something breaks during an event, escalation path, member communication template | 1 hour (I can write it) |
| **Kenya DPA Compliance Checklist** | A 15-point checklist against the Act: what data you collect, legal basis, retention periods, erasure mechanism, ODPC registration | 2 hours (I can write it) |
| **k6 Load Test Script** | A JavaScript script for k6 that simulates 500 concurrent users hitting your `/profile` and check-in endpoints, with a results interpretation guide | 2 hours (I can build it) |

---

*All cost estimates in USD. Labour estimates assume a solo developer familiar with the existing stack. Stack decisions marked as "decide consciously" require your direct input - they're not technical questions, they're product/organizational questions with technical implications.*
