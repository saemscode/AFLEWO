"use client";

import { useCallback, useState } from "react";

export type QrModalStateStatus =
  | "idle"
  | "loading"
  | "access_granted"
  | "not_yet_live"
  | "access_denied"
  | "error";

interface AccessGrantedData {
  qrDataUrl: string;
  token: string;
  identityFp: string;
  actionLabel: string;
  actionHref: string;
  expiresAt: string;
}

interface NotYetLiveData {
  countdownTarget: string;
  waitlistLabel: string;
}

interface AccessDeniedData {
  wittyRedirect: string;
  redirectLabel: string;
  redirectHref: string;
}

export type QrModalState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "access_granted"; data: AccessGrantedData }
  | { status: "not_yet_live"; data: NotYetLiveData }
  | { status: "access_denied"; data: AccessDeniedData }
  | { status: "error"; message: string };

/**
 * useQrModalState
 *
 * Fetches the server-resolved QR modal state for a given resource.
 * Never computes state client-side from cached tier info — tier and resource
 * state can both change between page load and modal open.
 *
 * Call fetchState() when the modal opens (or when the user clicks "Regenerate").
 * The hook resets to idle when resourceId changes.
 */
export function useQrModalState(
  resourceId: string | null,
  resourceType: "chapter_registration" | "chapter_event" | "resource" = "chapter_registration"
) {
  const [state, setState] = useState<QrModalState>({ status: "idle" });

  const fetchState = useCallback(async () => {
    if (!resourceId) return;
    setState({ status: "loading" });

    try {
      const res = await fetch(
        `/api/qr/${encodeURIComponent(resourceId)}?resourceType=${resourceType}`,
        { method: "GET", credentials: "include" }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ status: "error", message: err?.error || "Something went wrong" });
        return;
      }

      const data = await res.json();

      switch (data.state) {
        case "access_granted":
          setState({ status: "access_granted", data });
          break;
        case "not_yet_live":
          setState({ status: "not_yet_live", data });
          break;
        case "access_denied":
          setState({ status: "access_denied", data });
          break;
        default:
          setState({ status: "error", message: "Unexpected response from server" });
      }
    } catch (e) {
      console.error("[useQrModalState]", e);
      setState({ status: "error", message: "Could not connect. Try again." });
    }
  }, [resourceId, resourceType]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, fetchState, reset };
}
