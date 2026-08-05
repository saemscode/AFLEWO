/**
 * AFLEWO - QR Token Generation & State Resolution
 * Route: GET /api/qr/[resourceId]
 *
 * Runs on Node.js runtime (not Edge) - required for:
 *   - Node crypto module (HMAC-SHA256 without polyfills)
 *   - Full @supabase/ssr support
 *   - Single codebase with no logic drift vs a separate Edge Function
 *
 * Security model (defense in depth):
 *   - Route resolves tier via resolve_access_tier() (same fn as RLS policies)
 *   - Supabase RLS is the enforcement backstop - even if this route has a bug,
 *     the underlying DB read/write is still gated by RLS
 *   - user_id NEVER leaves this function - only identity_fp crosses the boundary
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import QRCode from "qrcode";

export const runtime = "nodejs";

// ─── Constants (non-negotiable after first production token) ─────────────────
// These four decisions can NEVER be changed once real tokens exist in production.
// Changing them invalidates or silently breaks every token issued before the change.

/** Token entropy: 22 base62 chars = ~131 bits. Never shorten. */
const TOKEN_LENGTH = 22;
/** identity_fp truncation: 16 bytes = 128-bit space. Collision-safe at AFLEWO scale. */
const FP_BYTES = 16;
/** Schema version: increment only on a deliberate breaking migration. */
const SCHEMA_VERSION = 1;
/** Default expiry: 24 hours. Configurable per-resource via expires_in_hours param. */
const DEFAULT_EXPIRY_HOURS = 24;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// ─── Token generation ─────────────────────────────────────────────────────────

function generateBase62Token(length: number): string {
  const bytes = crypto.randomBytes(length * 2); // generous buffer
  let token = "";
  for (let i = 0; i < bytes.length && token.length < length; i++) {
    const byte = bytes[i];
    if (byte < 248) {
      // reject values ≥ 248 to avoid modulo bias (248 = 4 * 62)
      token += BASE62[byte % 62];
    }
  }
  return token;
}

/**
 * identity_fp = HMAC-SHA256(SERVER_SECRET, user_id), base32-encoded, 16 bytes.
 * This is STABLE FOREVER per user - never changes, safe to log and analytics-join.
 * The SERVER_SECRET lives in Vercel Environment Variables as QR_SERVER_SECRET.
 */
function computeIdentityFp(userId: string): string {
  const secret = process.env.QR_SERVER_SECRET;
  if (!secret) throw new Error("QR_SERVER_SECRET is not configured");
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(userId);
  const raw = hmac.digest();
  // Truncate to FP_BYTES then base32-encode
  const truncated = raw.subarray(0, FP_BYTES);
  return bufferToBase32(truncated);
}

/** RFC 4648 base32 (no padding) - stable, URL-safe, human-readable in logs */
function bufferToBase32(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

// ─── Tier ordering ────────────────────────────────────────────────────────────

type AccessTier = "anonymous" | "public" | "member" | "alumni" | "chapter_admin" | "super_admin";

const TIER_ORDER: Record<AccessTier, number> = {
  anonymous: 0,
  public: 1,
  member: 2,
  alumni: 3,
  chapter_admin: 4,
  super_admin: 5,
};

function tierMeetsMinimum(viewer: AccessTier, min: AccessTier): boolean {
  return TIER_ORDER[viewer] >= TIER_ORDER[min];
}

// ─── QR modal state ──────────────────────────────────────────────────────────

type ModalState = "access_granted" | "not_yet_live" | "access_denied";

type QrStateResponse =
  | {
    state: "access_granted";
    qrDataUrl: string;
    token: string;
    identityFp: string;
    actionLabel: string;
    actionHref: string;
    expiresAt: string;
  }
  | {
    state: "not_yet_live";
    countdownTarget: string; // ISO string
    waitlistLabel: string;
  }
  | {
    state: "access_denied";
    wittyRedirect: string;
    redirectLabel: string;
    redirectHref: string;
  };

// ─── Witty redirects - varied so pattern can't be reverse-engineered ─────────
const WITTY_REDIRECTS = [
  {
    text: "That one's still being tuned backstage! While we wait, there's plenty happening at your chapter.",
    label: "See Events",
    href: "/events",
  },
  {
    text: "Still under wraps for now - but the worship doesn't stop. Check what's confirmed near you.",
    label: "Browse Chapters",
    href: "/#chapters",
  },
  {
    text: "Not quite ready to share that yet! Want to see what's open? The Join page is a good start.",
    label: "Join AFLEWO",
    href: "/join",
  },
  {
    text: "That's coming - just not today. In the meantime, there's a full season of events to explore.",
    label: "Events Calendar",
    href: "/events",
  },
  {
    text: "We're holding that one close for now. There's still a lot to discover on the Media page though.",
    label: "Media Archive",
    href: "/media",
  },
];

function pickWittyRedirect(seed: string) {
  // Deterministic but varied - seeded by resourceId so the same resource
  // always shows the same redirect (not random per-request, which would be fingerprintable)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return WITTY_REDIRECTS[Math.abs(hash) % WITTY_REDIRECTS.length];
}

// ─── Session-scoped (RLS-respecting) Supabase client ─────────────────────────

function createSessionSupabaseClient(req: NextRequest) {
  const cookies = req.cookies;
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll() {
          // Read-only context - no cookie writes needed here
        },
      },
    }
  );
}

/** Service-role client - ONLY used for the token INSERT after tier is verified. */
function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { resourceId: string } }
): Promise<NextResponse> {
  const { resourceId } = params;
  const searchParams = req.nextUrl.searchParams;
  const resourceType = searchParams.get("resourceType") || "chapter_registration";
  const expiryHours = Math.min(
    parseInt(searchParams.get("expiryHours") || String(DEFAULT_EXPIRY_HOURS), 10),
    72 // max 72h to prevent tokens living too long
  );

  // ── 1. Resolve user session (RLS-scoped client) ───────────────────────────
  const sessionClient = createSessionSupabaseClient(req);
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const userId = user?.id ?? null;

  // ── 2. Resolve access tier via Postgres function (same as RLS policies) ───
  let viewerTier: AccessTier = "anonymous";
  if (userId) {
    const { data: tierData } = await sessionClient.rpc("resolve_access_tier", {
      uid: userId,
    });
    if (tierData) viewerTier = tierData as AccessTier;
  }

  // ── 3. Fetch resource state + min_tier ───────────────────────────────────
  // Determine which table to query based on resourceType
  let resourceState: string = "open";
  let minTier: AccessTier = "member";
  let actionLabel = "Register";
  let actionHref = "/join";
  let countdownTarget: string | null = null;

  if (resourceType === "chapter_registration") {
    // Chapters use qr_mode + registration_open + the live chapter link
    const { data: chapterData } = await sessionClient
      .from("chapters")
      .select("qr_mode, registration_open, link, min_tier, visibility_state, name")
      .eq("id", resourceId)
      .single();

    if (chapterData) {
      resourceState = chapterData.visibility_state || (chapterData.registration_open ? "open" : "announced_not_open");
      minTier = (chapterData.min_tier as AccessTier) || "public";
      actionLabel = "Register";
      // Use the live Google Form link - falls back to the known AFLEWO form
      actionHref =
        chapterData.link ||
        "https://docs.google.com/forms/d/e/1FAIpQLSevWug3ISRoyVTi4edAgdehWJZCR4wZ1FkhfFmtYsXUazQLyQ/viewform";
    }
  } else if (resourceType === "chapter_event") {
    const { data: eventData } = await sessionClient
      .from("chapter_events")
      .select("visibility_state, min_tier, starts_at, title")
      .eq("id", resourceId)
      .single();

    if (eventData) {
      resourceState = eventData.visibility_state || "open";
      minTier = (eventData.min_tier as AccessTier) || "public";
      actionLabel = "View Event";
      if (eventData.starts_at) countdownTarget = eventData.starts_at;
    }
  } else if (resourceType === "resource") {
    const { data: resourceData } = await sessionClient
      .from("resources")
      .select("visibility_state, min_tier, allowed_role, title")
      .eq("id", resourceId)
      .single();

    if (resourceData) {
      resourceState = resourceData.visibility_state || "open";
      minTier = (resourceData.min_tier as AccessTier) || "member";
      actionLabel = "Download";
    }
  }

  // ── 4. Resolve modal state ────────────────────────────────────────────────
  let modalState: ModalState;

  if (resourceState === "hidden" || !tierMeetsMinimum(viewerTier, minTier)) {
    modalState = "access_denied";
  } else if (resourceState === "announced_not_open") {
    modalState = "not_yet_live";
  } else {
    modalState = "access_granted";
  }

  // ── 5. Build response per state ───────────────────────────────────────────
  if (modalState === "access_denied") {
    const redirect = pickWittyRedirect(resourceId);
    return NextResponse.json({
      state: "access_denied",
      wittyRedirect: redirect.text,
      redirectLabel: redirect.label,
      redirectHref: redirect.href,
    } satisfies QrStateResponse);
  }

  if (modalState === "not_yet_live") {
    // For announced events: count down to event start, or 30 days from now if unknown
    const target =
      countdownTarget ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return NextResponse.json({
      state: "not_yet_live",
      countdownTarget: target,
      waitlistLabel: "Notify me when it opens",
    } satisfies QrStateResponse);
  }

  // ── 6. Access granted: generate token + QR ────────────────────────────────
  if (!userId) {
    // Shouldn't happen (anonymous tier wouldn't reach here), but guard anyway
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Compute stable identity fingerprint (never expose userId in response)
  let identityFp: string;
  try {
    identityFp = computeIdentityFp(userId);
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const token = generateBase62Token(TOKEN_LENGTH);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + expiryHours * 60 * 60 * 1000);

  // Determine single_use based on resource type
  const singleUse = resourceType === "chapter_registration"; // registrations are single-use; downloads are reusable

  // ── 7. Insert token using service-role client (bypasses RLS intentionally) ─
  // The tier check above is the actual enforcement - this insert is post-validation.
  const serviceClient = createServiceSupabaseClient();
  const { error: insertError } = await serviceClient.from("qr_tokens").insert({
    token,
    identity_fp: identityFp,
    user_id: userId,
    resource_type: resourceType,
    resource_id: resourceId,
    tier_at_issue: viewerTier,
    single_use: singleUse,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    schema_version: SCHEMA_VERSION,
  });

  if (insertError) {
    console.error("[QR] Token insert failed:", insertError.message);
    return NextResponse.json({ error: "Token generation failed" }, { status: 500 });
  }

  // ── 8. Generate QR code data URI (server-side, no client libs) ────────────
  // The QR encodes ONLY the opaque token - nothing decodable.
  // The scan endpoint looks up the token server-side.
  const qrPayload = `${process.env.NEXT_PUBLIC_SITE_URL || "https://aflewo.saemstunes.com"}/api/qr/scan?t=${token}`;

  let qrDataUrl: string;
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 300,
      color: {
        dark: "#201C18",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.error("[QR] QR code generation failed:", err);
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }

  return NextResponse.json({
    state: "access_granted",
    qrDataUrl,
    token,
    identityFp, // safe to expose - opaque HMAC fingerprint, not user_id
    actionLabel,
    actionHref,
    expiresAt: expiresAt.toISOString(),
  } satisfies QrStateResponse);
}
