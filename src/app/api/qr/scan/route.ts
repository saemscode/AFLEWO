/**
 * AFLEWO — QR Token Scan Handler
 * Route: GET /api/qr/scan?t=[token]
 *
 * Called when a QR code is physically scanned (e.g. at an event check-in desk,
 * or by a user's camera app hitting the encoded URL).
 *
 * Responsibilities:
 *   1. Look up the token
 *   2. Validate: not expired, not already consumed (if single_use)
 *   3. Log analytics event (resource_id, identity_fp, chapter, timestamp)
 *   4. Increment scan_count
 *   5. Set consumed_at if single_use
 *   6. Redirect to the appropriate action (registration, download, etc.)
 *
 * NOTE: user_id is never logged to analytics — only identity_fp crosses that boundary.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("t");

  if (!token || token.length !== 22) {
    return NextResponse.redirect(
      new URL("/?qr=invalid", req.url)
    );
  }

  const supabase = serviceClient();

  // ── 1. Fetch token record ─────────────────────────────────────────────────
  const { data: qr, error } = await supabase
    .from("qr_tokens")
    .select(
      "token, identity_fp, resource_type, resource_id, tier_at_issue, single_use, issued_at, expires_at, consumed_at, scan_count"
    )
    .eq("token", token)
    .single();

  if (error || !qr) {
    console.warn(`[QR Scan] Token not found: ${token}`);
    return NextResponse.redirect(new URL("/?qr=invalid", req.url));
  }

  const now = new Date();

  // ── 2. Validate expiry ───────────────────────────────────────────────────
  if (new Date(qr.expires_at) < now) {
    console.info(`[QR Scan] Token expired — identity_fp: ${qr.identity_fp}`);
    return NextResponse.redirect(new URL("/?qr=expired", req.url));
  }

  // ── 3. Validate single-use consumption ───────────────────────────────────
  if (qr.single_use && qr.consumed_at) {
    console.info(`[QR Scan] Token already consumed — identity_fp: ${qr.identity_fp}`);
    return NextResponse.redirect(new URL("/?qr=used", req.url));
  }

  // ── 4. Mark consumed + increment scan_count ──────────────────────────────
  const updatePayload: Record<string, unknown> = {
    scan_count: (qr.scan_count || 0) + 1,
  };
  if (qr.single_use && !qr.consumed_at) {
    updatePayload.consumed_at = now.toISOString();
  }

  await supabase
    .from("qr_tokens")
    .update(updatePayload)
    .eq("token", token);

  // ── 5. Log analytics (identity_fp only, never user_id) ───────────────────
  console.info(
    `[QR Scan] ✓ token=${token.slice(0, 6)}… identity_fp=${qr.identity_fp} ` +
    `resource=${qr.resource_type}/${qr.resource_id} tier=${qr.tier_at_issue} ` +
    `scan_count=${(qr.scan_count || 0) + 1}`
  );

  // ── 6. Resolve redirect target based on resource type ────────────────────
  let redirectUrl: string;

  if (qr.resource_type === "chapter_registration") {
    // Fetch the chapter's registration link
    const { data: chapter } = await supabase
      .from("chapters")
      .select("link, slug")
      .eq("id", qr.resource_id)
      .single();

    redirectUrl =
      chapter?.link ||
      "https://docs.google.com/forms/d/e/1FAIpQLSevWug3ISRoyVTi4edAgdehWJZCR4wZ1FkhfFmtYsXUazQLyQ/viewform";
  } else if (qr.resource_type === "chapter_event") {
    redirectUrl = `/events?qr=scanned&token=${token}`;
  } else if (qr.resource_type === "resource") {
    const { data: resource } = await supabase
      .from("resources")
      .select("file_url, external_url")
      .eq("id", qr.resource_id)
      .single();

    redirectUrl =
      resource?.file_url ||
      resource?.external_url ||
      `/media?qr=scanned`;
  } else {
    redirectUrl = "/?qr=scanned";
  }

  return NextResponse.redirect(redirectUrl.startsWith("http") ? redirectUrl : new URL(redirectUrl, req.url));
}
