# AFLEWO - Full-Stack Production Readiness Audit
**Mode: EXPLAIN ONLY - NO EXECUTE**
**Date: July 2026 | Author: Antigravity AI**

---

## Preface - Known Context
| Item | Detail |
|---|---|
| Frontend | Next.js (App Router), hosted on Vercel |
| Edge/CDN | Cloudflare ($5/mo Workers Paid plan), saemstunes.com proxied orange |
| Database | Supabase Pro ($25) + Compute add-on (~$9) = ~$34/mo |
| Total spend | ~$39/mo |
| Key stress case | 7,000–10,000 simultaneous users on AFLEWO Night |
| Sub-domain plan | aflewo.saemstunes.com (CNAME → Vercel, orange-cloud Cloudflare) |
| Auth | Supabase Auth + RLS (infinite recursion bug fixed this session) |
| Roles | super_admin, chapter_admin, choir_member, band_member, volunteer, applicant, attendance_admin (proposed) |
| Media | gallery_images Supabase table + Cloudinary mention + R2 mirror mention |
| Sister app | Saem's Tunes (Vite/React SPA, d:\STA\v001, separate Supabase project) |

---

## a) Production-Readiness Percentage by Layer

| Layer | % Ready | Already Covered | Assumed-But-Unverified | Known Gap |
|---|---|---|---|---|
| **Frontend delivery & scaling** | 75% | Vercel edge network, Next.js App Router, image optimization | Vercel free-tier concurrency limits untested under load | No Vercel Pro yet - free tier circuit breakers will trip at 7k simultaneous users |
| **Database & backend logic** | 65% | Supabase Pro, PgBouncer connection pooling, RLS fixed this session | PgBouncer default pool size (~25) not verified for spike load | No read replicas; no Supabase compute pre-scaling plan for event nights |
| **Auth & identity** | 70% | Supabase Auth (email + OAuth), RLS hierarchy fully implemented | Session token refresh under load untested | Passkey/WebAuthn not yet built; attendance_admin role not in DB schema yet |
| **Media/storage pipeline** | 40% | gallery_images table built, Cloudinary referenced | R2 mirror sync not verified; no lifecycle/retention policy defined | No CDN delivery strategy for audio/video stems; no upload size limits enforced |
| **Edge/CDN & DDoS resilience** | 80% | Cloudflare $5 plan, orange-cloud proxy, 10M requests/mo | aflewo.saemstunes.com subdomain not yet orange-clouded | No Cloudflare Cache Rules tuned for AFLEWO specifically; no rate-limit rules written |
| **Observability & monitoring** | 10% | Vercel deployment logs | Nothing real-time | No error tracking (Sentry), no uptime alerting, no DB query monitoring |
| **Backup & disaster recovery** | 60% | Supabase Pro daily backups (7-day retention) | Backup restore never tested | No off-platform backup (e.g., pg_dump to R2); no RTO/RPO defined |
| **CI/CD & deployment safety** | 50% | Vercel Git integration, preview deployments | No staging environment confirmed | No branch protection rules; no automated test suite; no rollback plan beyond Vercel instant rollback |
| **Security & compliance posture** | 55% | RLS policies, SECURITY DEFINER functions, Supabase Auth | Security headers (CSP, HSTS) not verified on Cloudflare | No penetration test; no data processing agreement for Kenyan DPA; no consent banner |
| **Cost predictability at scale** | 40% | Cloudflare absorbs bandwidth spikes free | Supabase compute spike cost unquantified | No budget alert/cap configured anywhere; event-night cost unknown |

**Overall estimate: ~55% production-ready.** The critical gaps are observability (you'd learn about a crash from a user complaint) and the Vercel free-tier limit for event nights.

---

## b) Full Inventory - Tools, Capacity & Items of Interest

### Hosting & Compute
- Vercel (frontend, serverless functions, API routes)
- Cloudflare Workers (edge compute, already on $5 plan)
- Supabase Edge Functions (Deno, for backend logic close to DB)

### Database
- Supabase PostgreSQL (primary)
- PgBouncer (connection pooler, included with Supabase)
- Supabase Read Replicas (available on Pro, not yet enabled)

### Authentication & Session Management
- Supabase Auth (email/password, Google OAuth, GitHub OAuth)
- Supabase RLS + SECURITY DEFINER functions (implemented)
- WebAuthn/Passkey (discussed, not built)

### Media/Asset Storage & Delivery
- Supabase Storage (currently used for gallery_images)
- Cloudinary (referenced in codebase - image transformation, optimization)
- Cloudflare R2 (S3-compatible, zero egress fees - mentioned as mirror target)
- Audio/video stems for choir resources (no CDN delivery strategy yet)

### CDN, Caching & DDoS Protection
- Cloudflare (primary CDN, $5 plan, orange-cloud proxy)
- Vercel Edge Network (secondary, handles Next.js SSR caching)

### Domain, DNS & SSL/TLS
- saemstunes.com (Cloudflare DNS, Universal SSL active)
- aflewo.saemstunes.com (CNAME to Vercel planned, not yet orange-clouded)
- Vercel SSL (automatic, Let's Encrypt behind Cloudflare)

### Email & SMS Delivery
- Brevo (confirmed in previous session - transactional email for auth/notifications)
- SMS gap: No SMS provider configured (relevant for attendance OTP fallback)

### Payments & Donations
- No payment infrastructure confirmed for AFLEWO yet
- Saem's Tunes has a payment/wallet system (separate project)

### Analytics & Usage Tracking
- Vercel Analytics (on saemstunes.com hostname check in App.tsx)
- Vercel Speed Insights (conditional on hostname)
- No analytics configured for AFLEWO specifically

### Error Tracking & Logging
- **Currently: Nothing.** Vercel deployment logs only.

### Uptime & Incident Monitoring
- **Currently: Nothing.** No alerting configured.

### CI/CD & Environment Management
- Vercel Git integration (production on main branch)
- No staging environment confirmed
- No automated tests

### Backup & Disaster Recovery
- Supabase Pro daily backups (7-day retention, point-in-time recovery)
- No secondary off-platform backup confirmed

### Rate Limiting & Abuse Prevention
- Cloudflare WAF (available on $5 plan, no custom rules written yet)
- Supabase Auth rate limits (built-in, default thresholds)

### Compliance & Data Residency
- Supabase hosted on AWS (region unconfirmed - likely us-east-1)
- Kenyan Data Protection Act 2019 applies to AFLEWO's user data
- No privacy policy / consent flow confirmed beyond Terms & Privacy pages

### Team & Ops Tooling
- No status page (e.g., Statuspage.io or Cloudflare Status)
- No runbook / incident playbook
- No on-call rotation

---

## c) Options Matrix Per Category

### Hosting & Compute (Frontend)

| Option | Capability & Ceiling | Pricing | Selling Point | Failure Mode | Lock-in Risk |
|---|---|---|---|---|---|
| **Vercel Free** | Serverless, global edge, Next.js native. Ceiling: 100GB BW, hobby ToS limits | $0 | Zero config for Next.js | Trips at event-night traffic; ToS violation risk | High (Next.js features) |
| **Vercel Pro** | Same + 1TB BW, commercial ToS, team features | $20/mo | Perfect Next.js compatibility, instant rollback | Expensive at 5–10x scale ($$$) | High |
| **Cloudflare Pages** | Static + Workers, global edge, zero egress. Ceiling: needs adapter for Next.js | $5/mo (Workers) | Zero bandwidth cost, already paying for it | Next.js App Router edge cases with adapter | Medium |
| **Railway/Render** | Container-based, more flexible. Ceiling: not edge-native | $5–20/mo | Easy Docker deploys | Cold starts, no global edge | Low |

**Recommendation:** Vercel Pro ($20/mo) for guaranteed Next.js compatibility + event safety. Cloudflare Pages viable if willing to test the adapter.

---

### Database

| Option | Capability & Ceiling | Pricing | Selling Point | Failure Mode | Lock-in Risk |
|---|---|---|---|---|---|
| **Supabase Pro** (current) | Managed PostgreSQL, PgBouncer, Auth, RLS, Edge Functions. Ceiling: single compute instance | $25 + compute | All-in-one; RLS + Auth integrated | Single point of failure; no read replicas on base Pro | Medium |
| **Supabase + Read Replica** | Adds a read-only replica for SELECT queries | +$25/mo | Offloads read load during event spikes | Write bottleneck remains on primary | Medium |
| **PlanetScale** | Horizontal MySQL scaling, branching. Ceiling: no Postgres, no RLS | $39/mo | Infinite horizontal write scaling | Not Postgres; loses Supabase Auth integration | High |
| **Neon** | Serverless Postgres, auto-suspend, branching | $19/mo | Cheapest managed Postgres | Serverless cold starts on low-traffic days | Low |

**Recommendation:** Stay on Supabase Pro. Enable a Read Replica before major events.

---

### Authentication & Session Management

| Option | Capability | Pricing | Selling Point | Failure Mode | Lock-in Risk |
|---|---|---|---|---|---|
| **Supabase Auth** (current) | Email, OAuth, Magic Link, RLS integration | Included in Pro | Native DB integration, no extra service | Auth outage = site outage | High |
| **Clerk** | Drop-in auth, organizations, MFA, passkeys | Free up to 10k MAU, then $25/mo | Beautiful UI, org management | Extra service dependency; cost at scale | Medium |
| **Auth0** | Enterprise-grade, SAML, compliance | Free up to 7.5k MAU, then $23/mo | Compliance certifications | Complex, overkill for AFLEWO now | High |
| **Better Auth** | Open-source, self-hosted | Free (hosting cost only) | Full control, no vendor dependency | You maintain it | Low |

**Recommendation:** Stay on Supabase Auth. Build Passkey support on top of it when ready.

---

### Media / Asset Storage & Delivery

| Option | Capability | Pricing | Selling Point | Failure Mode | Lock-in Risk |
|---|---|---|---|---|---|
| **Cloudflare R2** | S3-compatible object storage, zero egress | $0.015/GB stored, $0 egress | Zero egress = no bill surprise at event scale | No built-in image transformation | Low |
| **Cloudinary** | Image/video transforms, CDN delivery | Free: 25 credits/mo, Paid: $89/mo | On-the-fly transforms (resize, compress, format) | Expensive fast; credits system confusing | High |
| **Supabase Storage** | S3-compatible, integrated with RLS | Included up to 100GB on Pro | RLS-aware storage permissions | 200MB file size limit; no transform | Medium |
| **Bunny.net** | CDN + storage, video streaming | $0.01/GB stored, $0.005/GB egress | Cheapest CDN for video streaming | Smaller ecosystem | Low |

**Recommendation:** R2 as primary storage (zero egress), Cloudinary for image transforms only, Supabase Storage for small RLS-protected member files (chord charts, PDFs).

---

### Email & SMS Delivery

| Option | Capability | Pricing | Selling Point | Failure Mode | Lock-in Risk |
|---|---|---|---|---|---|
| **Brevo** (current) | Transactional + marketing email, SMS | Free: 300/day; Starter: $9/mo | Already integrated; generous free tier | Deliverability issues at bulk volume | Low |
| **Resend** | Developer-first transactional email | Free: 3k/mo; Pro: $20/mo | Excellent deliverability, simple API | Email only, no SMS | Low |
| **Postmark** | Transactional email specialist | $15/mo for 10k | Industry-best deliverability | Marketing email not supported | Low |
| **Africa's Talking** | SMS + USSD + voice for African networks | Pay-per-use (~$0.03/SMS Kenya) | **Kenya-native carrier integration** | SMS only | Low |

**Recommendation:** Keep Brevo for email. Add **Africa's Talking** for SMS OTP (attendance PIN fallback) - it has direct Safaricom/Airtel integrations.

---

### Observability & Monitoring (BIGGEST CURRENT GAP)

| Option | Capability | Pricing | Selling Point | Failure Mode | Lock-in Risk |
|---|---|---|---|---|---|
| **Sentry** | Error tracking, performance, session replay | Free: 5k errors/mo; Team: $26/mo | Catches JS crashes before users report them | Alert fatigue if not tuned | Low |
| **BetterStack** | Uptime + log aggregation + on-call alerts | Free: 10 monitors; Hobby: $25/mo | Combines uptime ping + structured logs | Not as deep as Datadog | Low |
| **Grafana + Prometheus** | Full metrics stack, self-hosted | Free (hosting cost) | Unlimited data retention, no vendor | Requires DevOps knowledge to maintain | None |
| **Vercel Analytics** | Basic traffic analytics, built-in | Free on Pro plan | Zero config, already in codebase | No error tracking, no alerting | High |
| **Cloudflare Analytics** | Traffic, threats, cache hit rate | Free with $5 plan | Already available right now, zero cost | No app-level error tracking | None |

**Recommendation:** Add **Sentry** (free tier covers AFLEWO's volume) + **BetterStack** for uptime pings. Activate Cloudflare Analytics immediately - it's already paid for.

---

### CI/CD & Environment Management

| Option | Capability | Pricing | Selling Point | Failure Mode |
|---|---|---|---|---|
| **Vercel Git Integration** (current) | Auto-deploy on push, preview URLs | Included | Zero config for Next.js | No test gates before deploy |
| **GitHub Actions** | Arbitrary workflows, test runners, build gates | Free for public repos, 2k min/mo private | Runs tests before Vercel deploys | Requires writing workflows |
| **Staging environment** | Separate Vercel project + Supabase project | ~$0 (free tier for staging) | Catch bugs before production | Doubles the environment management |

**Recommendation:** Create a `staging` branch → separate Vercel project. Add GitHub Actions to run a basic smoke test before merging to main.

---

### Rate Limiting & Abuse Prevention

| Option | Capability | Pricing | Selling Point |
|---|---|---|---|
| **Cloudflare WAF Rules** | Block IPs, rate-limit by endpoint, bot challenge | Included in $5 plan | Already paying for it; write rules now |
| **Supabase Auth Rate Limits** | Built-in per-email, per-IP limits | Included | No extra config needed |
| **Arcjet** | JS-native rate limiting in Next.js API routes | Free: 10k req/mo | Code-level control, works with Edge Functions |

**Recommendation:** Write Cloudflare WAF rate-limit rules for `/api/auth/*` and `/api/attendance/*` before the next event. Zero extra cost.

---

## d) Event-Night Load Modeling

### What I can infer from context:

**Peak concurrent users:** You've cited 7,000 singers + non-singers = potentially 10,000+. During doors-open (e.g., 6:30–7:15 PM), assume 60–70% attempt simultaneous check-in = ~6,000–7,000 database writes in a 45-minute window = ~130–155 writes/second sustained. That is survivable with Supabase Pro + PgBouncer if the compute tier is upgraded.

**Traffic shape:** Multiple spikes, not one. Expect:
1. **Spike 1 (Arrival):** QR check-ins at the door
2. **Spike 2 (Worship segments):** Members downloading lyric PDFs / chord charts
3. **Spike 3 (Altar call / testimonies):** Photo/video uploads if that feature is built
4. **Spike 4 (End of night):** Everyone leaves simultaneously, stat refresh

**Which actions create the most load:**
- QR attendance write: Very cheap (single INSERT)
- Profile dashboard fetch: Medium (3–4 SELECT with JOINs)
- PDF download from Supabase Storage: **Heavy** - this is where CDN caching on Cloudflare/R2 is critical
- Real-time features (live chat, prayer wall): **Very Heavy** - WebSockets need Supabase Realtime quotas checked

### Questions needing your direct input:
- [ ] Has there been a previous AFLEWO Night with digital systems? What were the actual attendance numbers?
- [ ] Is the 7,000 number the full national choir count, or a single-event venue capacity?
- [ ] Are members expected to upload content (photos, testimonies) during the event?
- [ ] Is real-time (live prayer wall, live chat) in scope for this event?

**Cheapest load test:** Use [k6.io](https://k6.io) (free, open-source) to simulate 500 concurrent users hitting `/profile` and the attendance endpoint. Run it from a GitHub Action before the event.

---

## e) Media Pipeline & The "Destroy Protocol"

### What I can infer:
From the codebase, there is a `gallery_images` Supabase table (built this session) and references to Cloudinary in the AFLEWO context. An R2 mirror was mentioned as a destination.

### The likely intent of a "Destroy Protocol":
- **Storage cost runaway:** Cloudinary charges per transformation and storage. If unchecked, 10,000 members uploading event photos = runaway bills.
- **Stale/duplicate assets:** Event photos from 2019 taking up paid storage.
- **Takedown/compliance:** A member photo that needs to be removed legally.

### Open questions needing your input:
- [ ] What is the canonical source of truth - Cloudinary or R2? (If they drift, which wins?)
- [ ] Is there a retention policy? (e.g., event photos archived after 12 months to R2 cold storage?)
- [ ] Who has delete permission - super_admin only, or also chapter_admin for their chapter's content?
- [ ] Is there a soft-delete / 30-day rollback window before permanent deletion?

**Recommendation:** R2 as source of truth. Cloudinary as a transformation layer only (fetch from R2, transform, cache on Cloudflare). Soft-delete all assets (mark `deleted_at` in `gallery_images`), hard delete after 30 days via a pg_cron job.

---

## f) Near-Term vs. Long-Term Scope

### Next event ("Minimum Must Not Fail"):
- aflewo.saemstunes.com pointing to Vercel, orange-clouded on Cloudflare ✓ (not done yet)
- RLS recursion fixed ✓ (done this session)
- `/profile` route working ✓ (done this session)
- Attendance QR check-in system built (not built yet)
- Sentry + BetterStack uptime monitoring active (not done yet)
- Cloudflare WAF rate-limit rules on auth/attendance routes (not done yet)
- Supabase compute pre-scaled 48hrs before event (process not defined yet)

### 12 Months Out:
- Stable attendance_admin role with chapter-scoped kiosk mode
- Africa's Talking SMS integration for PIN fallback attendance
- R2 as primary media storage with Cloudflare CDN delivery
- Staging environment live
- 5–6 chapter pages with their own admin dashboards
- Possible progressive web app (PWA) for offline QR code display

### 3–5 Years:
At 10,000+ active members with multi-country chapters:
- Supabase Read Replicas become necessary
- A dedicated mobile app (React Native / Expo) becomes justified - specifically for offline QR code display and attendance
- Multi-region Supabase (currently only available on Enterprise) if chapters span East Africa
- An ops/infra responsibility handed to a dedicated technical lead within AFLEWO

---

## g) Budget & Ownership

### Current confirmed spend:
| Item | Monthly Cost |
|---|---|
| Supabase Pro | $25 |
| Supabase Compute Add-on | ~$9 |
| Cloudflare Workers Paid | $5 |
| Vercel (Free tier - **risk**) | $0 |
| **Total** | **~$39/mo** |

### Questions needing your input:
- [ ] Is $39/mo a hard ceiling, or is there appetite to go to $59/mo (adding Vercel Pro) before the next major event?
- [ ] Is the "scale up compute for event night, scale down Monday" model acceptable, or do you need consistent performance year-round?
- [ ] Who is the backup person if something breaks during a live event at 9 PM on a Saturday?

**Strong recommendation:** Budget $59/mo ($39 + $20 Vercel Pro) as the production floor. Before each major event, temporarily upgrade Supabase compute (+$20 for the month) = ~$79 for event months. This is still orders of magnitude cheaper than any alternative infrastructure.

---

## h) Data, Compliance & Connectivity Realities

### What I can infer:
- AFLEWO is Kenya-based with multi-chapter national reach
- Members include phone numbers, attendance records, audition submissions, full names - all personal data under the **Kenya Data Protection Act 2019**
- Event venues in Kenya may have variable connectivity (urban: good; rural/church venues: potentially 3G only on Safaricom/Airtel)

### Compliance exposure:
- A Data Protection Officer (DPO) may be required if processing data at scale
- A Privacy Notice must explicitly state what data is collected, why, and for how long
- Members must be able to request deletion of their data (right to erasure)
- Supabase's default data region (us-east-1) may be a DPA concern - Supabase does not currently offer an African region

### Connectivity / Low-bandwidth strategy:
- The AFLEWO site should work on 3G (≥1Mbps). Current Next.js bundle size should be audited.
- PDFs and audio stems must be cached on Cloudflare edge - not fetched from Supabase Storage on every access
- The QR code for attendance should be displayable **offline** on the member's phone (generated and cached as a static image on login, not fetched live)

### Questions needing your input:
- [ ] Has AFLEWO registered with the Office of the Data Protection Commissioner (ODPC) in Kenya?
- [ ] Does the Privacy page currently include a retention policy and right-to-erasure mechanism?

---

## i) Monitoring & Confidence

### Current state: "Someone complains" is the alert system.
This is dangerous for a live event with 7,000 users. There is zero real-time visibility right now.

### Minimum monitoring setup (zero to hero in one afternoon):

| Tool | What it gives you | Cost |
|---|---|---|
| **BetterStack Uptime** | Pings aflewo.saemstunes.com every 60 seconds; texts/emails you if it goes down | Free (up to 10 monitors) |
| **Sentry (Free tier)** | Catches JavaScript errors in the Next.js app; shows you the exact line of code that crashed | Free (5k errors/mo) |
| **Cloudflare Analytics** | Real-time traffic dashboard, cache hit rate, threat map | Already included in $5 plan |
| **Supabase Dashboard** | Query performance, slow queries, connection count | Already included in Pro |

**Total additional cost: $0.** All four tools are either already paid for or have generous free tiers that cover AFLEWO's current scale.

---

## Summary - The 5 Things To Do Before The Next Event

| Priority | Action | Cost | Time to implement |
|---|---|---|---|
| 🔴 CRITICAL | Upgrade to Vercel Pro | +$20/mo | 5 minutes |
| 🔴 CRITICAL | Add aflewo.saemstunes.com Cloudflare DNS + orange cloud | $0 | 10 minutes |
| 🔴 CRITICAL | Set up BetterStack uptime monitoring | $0 | 15 minutes |
| 🟠 HIGH | Add Sentry to Next.js app | $0 | 30 minutes |
| 🟠 HIGH | Write Cloudflare WAF rate-limit rules for /api/auth and attendance | $0 | 20 minutes |

---

*This document was generated from full codebase context: AFLEWO (d:\AFLEWO\af v001) + Saem's Tunes (d:\STA\v001) as of July 2026. Items marked with [ ] require direct owner input before final stack decisions can be made.*
