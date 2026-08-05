//@ts-nocheck
"use client";

import { useState } from "react";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingStatus } from "@/hooks/use-onboarding-status";

const CURRENT_YEAR = new Date().getFullYear();
const FIRST_YEAR = 2004;
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
);

/**
 * YearJoinedModal
 *
 * Non-dismissible post-auth modal — fires once for any signed-in user
 * whose profiles.year_joined is still NULL. Required step before accessing
 * any tiered content. Mount once at layout root; it self-gates via
 * useOnboardingStatus.
 *
 * Deliberately NOT dismissible by backdrop click or Escape (unlike ChapterModal /
 * QrModal) since this is a required onboarding step.
 */
export default function YearJoinedModal() {
  const { needsYearJoined, userId, loading, refresh } = useOnboardingStatus();
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isOpen = !loading && !!userId && needsYearJoined;

  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: "power2.out" }
      );
      gsap.fromTo(
        contentRef.current,
        { scale: 0.88, y: 48, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: "expo.out", delay: 0.1 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (selectedYear === "") {
      setError("Pick the year you joined AFLEWO.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ year_joined: selectedYear })
      .eq("id", userId!);

    setSubmitting(false);

    if (updateError) {
      setError("Couldn't save that — try again in a moment.");
      return;
    }

    refresh();
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
    // No onClick handler — this modal cannot be dismissed by backdrop click
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-md glass-card-elevated p-8 rounded-[2rem] border-white/10 text-center space-y-6"
      >
        {/* Decorative gold accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gold/20 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-gold fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>

          <h3 className="text-2xl font-black tracking-tighter">
            One quick thing{" "}
            <span className="text-gold">before you go on</span>
          </h3>
          <p className="text-foreground/50 text-sm leading-relaxed">
            What year did you first join AFLEWO? This helps us route you to the
            right chapter content and community.
          </p>
        </div>

        <select
          value={selectedYear}
          onChange={(e) =>
            setSelectedYear(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full py-4 px-4 rounded-xl bg-white/5 border border-white/10 text-center font-bold focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="" disabled>
            Select a year
          </option>
          {YEAR_OPTIONS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        {error && (
          <p className="text-red-400 text-xs font-bold">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || selectedYear === ""}
          className="w-full py-4 rounded-full bg-gold text-brown font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>

        <p className="text-foreground/30 text-[10px] uppercase tracking-widest leading-relaxed">
          Heads up — this can only be corrected by an admin once set.{" "}
          <br />
          Pick carefully.
        </p>
      </div>
    </div>
  );
}
