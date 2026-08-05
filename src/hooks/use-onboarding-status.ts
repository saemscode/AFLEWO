//@ts-nocheck

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStatus {
  loading: boolean;
  needsYearJoined: boolean;
  userId: string | null;
  refresh: () => void;
}

/**
 * useOnboardingStatus
 *
 * Checks whether the current authenticated user still needs to complete
 * the YearJoinedModal onboarding step. Uses onboarding_completed_at
 * as the canonical flag (not year_joined itself) to avoid re-deriving
 * completion logic on every render.
 *
 * Returns { loading, needsYearJoined, userId, refresh }.
 * Call refresh() after a successful year_joined save to re-evaluate.
 */
export function useOnboardingStatus(): OnboardingStatus {
  const [loading, setLoading] = useState(true);
  const [needsYearJoined, setNeedsYearJoined] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setUserId(null);
          setNeedsYearJoined(false);
          setLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("year_joined, onboarding_completed_at")
        .eq("id", user.id)
        .single();

      if (!cancelled) {
        setUserId(user.id);
        // needsYearJoined is true if profile exists but onboarding is not yet complete
        setNeedsYearJoined(
          !!profile &&
          profile.year_joined === null &&
          profile.onboarding_completed_at === null
        );
        setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    loading,
    needsYearJoined,
    userId,
    refresh: () => setTick((t) => t + 1),
  };
}
