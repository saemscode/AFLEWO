"use client";

import SvgIcon from "@/components/ui/SvgIcon";

interface ProfileYearJoinedFieldProps {
  yearJoined: number | null;
  onOpenCorrectionRequest?: () => void;
}

/**
 * ProfileYearJoinedField
 *
 * Read-only display component for the profile page. Shows the year the user
 * first joined AFLEWO. No inline edit - the write-once guard in the DB means
 * a normal update call would fail after the first set. Corrections go through
 * an admin contact flow (wired via onOpenCorrectionRequest).
 */
export default function ProfileYearJoinedField({
  yearJoined,
  onOpenCorrectionRequest,
}: ProfileYearJoinedFieldProps) {
  return (
    <div className="glass-card p-6 rounded-2xl space-y-2">
      <SvgIcon name="calendar" className="text-gold" size={20} />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
        Year Joined AFLEWO
      </p>

      {yearJoined ? (
        <p className="text-2xl font-black">{yearJoined}</p>
      ) : (
        <p className="text-sm font-bold text-red-400/80">Not set - required</p>
      )}

      {yearJoined && onOpenCorrectionRequest && (
        <button
          onClick={onOpenCorrectionRequest}
          className="text-[9px] uppercase tracking-widest text-foreground/40 hover:text-gold transition-colors underline underline-offset-2"
        >
          Something wrong? Request a correction
        </button>
      )}
    </div>
  );
}
