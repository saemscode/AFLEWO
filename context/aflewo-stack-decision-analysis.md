# AFLEWO Stack Decision - Config Packages, Cost, Prep & Gaps

## 1. Best Pick Per Category (Synthesized Recommendation)

| Category | Pick | Why |
|---|---|---|
| Frontend hosting | **Vercel Pro** | Next.js-native, zero adapter risk, instant rollback - the free tier is the single biggest event-night liability in the whole stack |
| Database | **Supabase Pro + Read Replica** (add before events only) | You already have RLS + Auth wired in; ripping that out for PlanetScale/Neon costs more in migration risk than it saves |
| Auth | **Stay on Supabase Auth** | Already integrated with RLS. Add passkeys later as an enhancement, not a replacement |
| Media storage | **R2 as source of truth, Cloudinary for transforms only** | R2's zero-egress pricing is the only one that doesn't scale linearly with event-night photo uploads |
| CDN/Edge | **Cloudflare (current $5 plan, but write the WAF rules)** | You're already paying for rate-limiting and DDoS protection you haven't turned on |
| Email | **Brevo (keep)** | Already integrated, free tier covers current volume |
| SMS | **Africa's Talking** | Only option with direct Safaricom/Airtel routing - generic providers (Twilio) route through international gateways with worse Kenya deliverability and cost |
| Observability | **Sentry + BetterStack** | Both have free tiers that fully cover AFLEWO's current scale - this is pure upside with no cost tradeoff |
| CI/CD | **Vercel Git + one staging project + GitHub Actions smoke test** | Minimum viable safety net without full DevOps overhead |

---

## 2a) Total Pricing - Stack Configurations

### Tier 1 - "Survive the Next Event" (minimum viable safety)
| Item | Cost |
|---|---|
| Vercel Pro | $20/mo |
| Supabase Pro + compute | $34/mo |
| Cloudflare Workers Paid | $5/mo |
| Sentry (free tier) | $0 |
| BetterStack (free tier) | $0 |
| **Monthly total** | **$59/mo** |
| **Labor Cost (One-time setup)** | **~$400–$500** (8–10 hrs @ ~$50/hr consulting rate): DNS/proxy, monitoring, WAF rules, load testing, and finalizing the QR attendance flow. (If you are volunteering this time, AFLEWO needs to recognize it as a ~$500 in-kind donation of highly specialized engineering expertise). |

### Tier 2 - "12-Month Stable" (chapter growth, SMS fallback, staging)
| Item | Cost |
|---|---|
| Everything in Tier 1 | $59/mo |
| Supabase Read Replica | +$25/mo |
| Africa's Talking SMS (pay-per-use, est. 5k SMS/mo during event season) | ~$150/mo (event months only, ~$0.03/SMS) - $0 in off-months |
| Staging Vercel + Supabase project | ~$0–25/mo (can run staging on free tiers) |
| **Monthly total (off-season)** | **~$84–109/mo** |
| **Monthly total (event month)** | **~$234/mo** |
| **Labor Cost (One-time setup)** | **~$450–$850** (9–17 hrs @ ~$50/hr): Staging environment config, Africa's Talking SMS API integration + OTP flow, and GitHub Actions smoke test pipelines. |

### Tier 3 - "3–5 Year Scale" (multi-country, mobile app, dedicated ops)
| Item | Cost |
|---|---|
| Everything in Tier 2 | ~$109/mo baseline |
| Supabase Team/Enterprise tier (multi-region conversations start here) | $599+/mo (Enterprise pricing is quote-based - this is a floor estimate) |
| Dedicated mobile app (React Native/Expo) - one-time build | $0 in cash if you build it, but 100+ hrs of dev time, or $8k–20k+ if outsourced |
| Part-time technical/ops hire | $300–800/mo (Kenya market rate for part-time ops-focused contractor) |
| **Monthly total** | **$1,000–1,500+/mo** |
| **Labor Cost (Build + Ongoing)** | **$5,000–$10,000+** one-time build (for the dedicated mobile app) AND/OR **$300–$800/mo** ongoing for a part-time technical/ops hire. This tier is where labor stops being just your hours and requires a formal budget. |

**Bottom line:** Tier 1 is a 5x cost increase from your current $39/mo but buys you out of the single biggest failure risk (Vercel free tier). Tier 2 only kicks in when SMS/staging actually matter. Tier 3 is a different conversation entirely - that's "AFLEWO becomes an institution with paid infrastructure staff," not an incremental upgrade.

---

## 2b) What to Prepare For

**Languages/tools you already have covered (based on your track record across CEKA, Nasaka, SafeTrack, NOD):**
- TypeScript/React/Next.js - no gap here
- Supabase (schema design, RLS, Edge Functions) - you've done this repeatedly, including fixing an infinite-recursion RLS bug this session
- Cloudflare (Workers, edge rendering) - you already resolved CEKA's SPA-indexability crisis using Cloudflare edge rendering

**New tools/skills for this specific workload:**
- **k6 (JavaScript-based load testing)** - you haven't load-tested at this scale before; k6 scripts are just JS, so the syntax isn't new, but the discipline of writing realistic traffic simulations is
- **SQL query performance reading (EXPLAIN ANALYZE)** - needed to actually verify PgBouncer pool sizing and catch slow JOINs before an event, not after
- **Sentry/BetterStack SDK config** - trivial technically (npm install + a few lines), but you need to decide what counts as "alert-worthy" so you don't get alert fatigue
- **Cloudflare WAF rule syntax** - declarative, not code-heavy, but you haven't written custom rules yet (only used the platform defaults)
- **Africa's Talking API** - new SDK, new auth flow (API key + username), Kenya-specific SMS/OTP patterns

**Contexts you need to get literate in (not code, but decisions):**
- **Kenya Data Protection Act 2019** - whether AFLEWO needs ODPC registration, what a compliant privacy notice looks like, right-to-erasure mechanics
- **Incident response process** - this is a *process* gap, not a technical one: who gets paged, what the escalation path is, what "resolved" means
- **Retention/lifecycle policy for media** - a decision you need to make once, not an ongoing skill

---

## 2c) Preparedness Assessment

**Where you're genuinely ahead of a typical solo founder at this stage:**
Your history shows you've already handled several of the *hard* problems this audit is worried about, just in different projects: multi-Supabase-project management (CEKA + Nasaka + AFLEWO), a real production incident response (OTP rate limiting after an actual bot attack on CEKA), edge-rendering fixes under real SEO/traffic stakes, and a full crisis/continuity manual for CEKA ahead of a known high-traffic date (Finance Bill anniversary). That last one especially is directly transferable - you've done "prepare the system for a predictable high-stakes traffic day" before, just for a different kind of event.

**Where the gap actually is:**
It's not coding ability - it's the *category* of problem. Everything you've built so far has been feature/product work with production hardening as a follow-up (fix the RLS bug after it breaks, add rate limiting after the bot attack happens). Event-night readiness is the opposite: it requires simulating the failure *before* it happens, because a live worship event doesn't get a hotfix window the way a website bug does. Load testing, capacity pre-scaling, and having monitoring live *before* the incident (not added after) is a different discipline than the iterate-and-fix loop you've been running successfully everywhere else.

**Realistic read:** You're probably 70% prepared on the technical execution (you could implement everything in Tier 1 within a weekend) and maybe 40% prepared on the operational discipline (load testing before rather than after, defined incident response, compliance paperwork) - because those aren't things your prior projects forced you to build yet.

---

## 3. Questions You're Missing (With Answers)

**Q: Is AFLEWO a registered legal entity, separate from Saem's Tunes?**
This matters for liability if a data breach happens during an event with 7,000+ people's data. If AFLEWO is legally just "a project Saem runs," any DPA complaint or liability exposure may trace back to you personally rather than an organization. Worth clarifying with a lawyer, not just a technical decision.

**Q: Who else has technical/admin access besides you?**
If you're the only person who can act during an incident, "who's on call" isn't really a question - it's always you. That's a single-point-of-failure risk worth naming explicitly, even if the honest answer right now is "just me."

**Q: How does AFLEWO get billed - do you have a card that handles USD billing for Vercel/Supabase/Cloudflare without forex friction?**
This is a real, frequently underestimated cost for African founders: failed international card charges causing surprise service suspensions mid-event-season. Worth confirming your billing method is stable before scaling spend to Tier 2/3 levels.

**Q: Is "AFLEWO" trademarked or brand-protected as it expands to more countries/chapters?**
Not a stack question, but relevant to "3–5 year scope" - if chapters in other countries start operating semi-independently, brand/name protection becomes a real gap.

**Q: What happens if the venue itself loses internet, not your servers?**
Your stack review assumes the failure is server-side. But a church venue on a shared connection dropping to zero mid-event is arguably more likely than Vercel/Supabase going down. Is there an offline fallback for attendance (e.g., pre-generated QR codes cached on-device, paper backup)?

**Q: Who owns the content rights to testimonies/photos submitted during events?**
Relevant to the Destroy Protocol conversation - if a member's testimony video needs to be taken down years later, do you have a documented consent/rights framework, or is it assumed implicitly?

**Q: Is there a plan for what happens to AFLEWO's data/access if you personally become unavailable (illness, travel, etc.)?**
Given you're the sole technical owner across CEKA, Nasaka, SafeTrack, NOD, and Saem's Tunes simultaneously, this is a real bus-factor question worth a one-paragraph answer somewhere, even informally.

Want me to turn any one of these - the incident response runbook, the Kenya DPA compliance checklist, or the k6 load test script - into its own standalone deliverable next?

---

## 4. Nasaka Precedent Correction - Vercel Pro Is NOT a Capacity Buy

Nasaka IEBC: **1.8–2.3M requests over 72 hours, 10–30k users, on Vercel Hobby, with zero Vercel-side changes.** Only the Supabase compute tier needed bumping. That directly changes the Vercel Pro recommendation:

| Reason cited for Vercel Pro | Valid? | Corrected verdict |
|---|---|---|
| Raw capacity / surviving 7k users | ❌ | Cloudflare + Vercel Hobby already handles this - Nasaka proved it |
| Bandwidth cost | ❌ | Cloudflare absorbs egress regardless of Vercel plan |
| ToS / commercial-use policy risk | ✅ | AFLEWO is an org, not a personal project - Hobby ToS is the genuine exposure |
| Concurrent function limits on POST writes | ⚠️ Partially | Client-side jitter (see below) eliminates this at zero cost |

**Verdict:** Vercel Pro is a *policy insurance* buy, not a capacity buy. It's a conscious decision, not a fire drill.

---

## 5. Thundering Herd Model - The Actual Event-Night Math

**Scenario:** QR code goes on screen at AFLEWO Night. 7,000 members scan within 5 minutes.

| Time window | Users connecting | Req/sec to backend (non-cacheable) |
|---|---|---|
| First 60–90 seconds | ~3,500 (50% of 7k) | **~100–190 req/sec** |
| Minutes 2–5 | Remaining ~3,500 | ~25–40 req/sec (tapering) |
| After 5 minutes | Normal event browse traffic | ~5–15 req/sec |

This is *lower total volume than Nasaka* - it's just compressed into 90 seconds. The database, not Vercel, is the bottleneck. Same pattern, same fix.

**Three zero-cost fixes that change the shape of the spike:**

1. **Client-side jitter** - add `await new Promise(r => setTimeout(r, Math.random() * 3000))` before the check-in POST fires. Users don't notice a 0–3s delay. The 190 req/sec peak becomes ~65 req/sec over a wider window.

2. **Optimistic UI** - show "✓ Checked in!" immediately in the client before the DB write confirms. The user's *experience* is instant. The actual INSERT can take 200ms and nobody cares.

3. **Cloudflare Cache Rules for everything static** - the announcement page, chapter info, schedule, lyric PDFs - cached at Cloudflare edge, never touches Vercel or Supabase during the spike. Only the check-in POST reaches the origin.

**With these three in place:** Supabase handles ~65–80 req/sec of actual writes during the peak 90-second window. That's well within a single compute-bumped Supabase Pro instance, same as Nasaka. No Read Replica needed.

---

## 6. Prioritized Action List (What to Do Next, In Order)

### 🔴 Before any major public event (~8 hours total, $0 additional cost)

| # | Action | Time |
|---|---|---|
| 1 | Wire `aflewo.saemstunes.com` in Cloudflare (CNAME → Vercel, orange cloud, verify SSL) | 30 min |
| 2 | Install BetterStack - uptime monitor + SMS/email alert | 30 min |
| 3 | Install Sentry in AFLEWO Next.js (`npx @sentry/wizard -i nextjs`) | 1 hr |
| 4 | Write 2 Cloudflare WAF rate-limit rules (`/api/auth/*` → 10 req/min, `/api/attendance/*` → 5 req/min per IP) | 1 hr |
| 5 | Write Cloudflare Cache Rules for static/anonymous pages (`/media`, `/chapters`, `/`, `/schedule`) | 1 hr |
| 6 | Confirm PgBouncer transaction mode (`pgbouncer=true&connection_limit=1` in connection string) | 30 min |
| 7 | Move org billing to a USD virtual card (Wise / Grey) - eliminates mid-event subscription failures | 1 hr |
| 8 | Add one trusted co-admin (read access) to Vercel, Supabase, Cloudflare | 30 min |
| 9 | Add `admin@aflewo.org` as primary owner on all vendor accounts | 30 min |
| 10 | Decide Vercel ToS consciously - upgrade to Pro ($20/mo) or document the risk and accept it | 10 min |

### 🟠 Before first large-scale event (~15 additional hours)

| # | Action | Time |
|---|---|---|
| 11 | Build attendance QR check-in system (member QR display + admin kiosk/manual override) | 4–6 hrs |
| 12 | Add client-side jitter + optimistic UI to check-in flow | 1–2 hrs |
| 13 | Write k6 load test script - 500 concurrent check-ins against staging | 2–3 hrs |
| 14 | Create staging environment (Vercel project + Supabase free project, `staging` branch) | 2 hrs |
| 15 | Migrate gallery_images to serve from R2 via Cloudflare CDN | 2–3 hrs |
| 16 | Write 1-page incident runbook (what to check first, who to call, member comms template) | 1 hr |
| 17 | Add content-license paragraph to Terms of Service for submitted testimonies/media | 30 min |

---

*Last updated: July 2026. Calibrated against Nasaka IEBC precedent (1.8–2.3M req / 72hrs / 30k users / Vercel Hobby) and AFLEWO thundering-herd model (7k check-ins / 90-second spike window).*

