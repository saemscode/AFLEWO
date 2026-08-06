"use client";

import React, { useState, useEffect } from "react";
import FlipClockCountdownLib from "@leenguyen/react-flip-clock-countdown";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";

interface FlipClockCountdownProps {
  targetDate: Date;
  size?: "compact" | "large";
}

export default function FlipClockCountdown({ targetDate, size = "large" }: FlipClockCountdownProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-24 text-gold/30 uppercase tracking-widest font-black text-xs">
        Loading Clock...
      </div>
    );
  }

  const isCompact = size === "compact";

  return (
    <div className="w-full max-w-full overflow-hidden flex justify-center">
      <FlipClockCountdownLib
        to={targetDate.getTime()}
        labels={["DAYS", "HOURS", "MINS", "SECS"]}
        labelStyle={{
          fontSize: isCompact ? "8px" : "10px",
          fontWeight: 900,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: isCompact ? "0.15em" : "0.25em",
          marginTop: isCompact ? "8px" : "16px",
          fontFamily: "inherit",
        }}
        digitBlockStyle={{
          width: isCompact ? "clamp(24px, 5vw, 52px)" : "clamp(38px, 6.5vw, 92px)",
          height: isCompact ? "clamp(34px, 6.5vw, 68px)" : "clamp(48px, 8.5vw, 116px)",
          fontSize: isCompact ? "clamp(1.0rem, 3vw, 2.4rem)" : "clamp(1.6rem, 4.5vw, 4.2rem)",
          fontWeight: 900,
          color: "#D4AF37",
          background: "linear-gradient(180deg, rgb(32,28,24) 0%, rgb(20,18,14) 100%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)",
          borderRadius: isCompact ? "6px" : "10px",
        }}
        dividerStyle={{
          color: "rgba(0,0,0,0.85)",
          height: isCompact ? 1 : 2,
        }}
        separatorStyle={{
          color: "rgba(212,175,55,0.4)",
          size: isCompact ? "4px" : "6px",
        }}
        duration={0.7}
        hideOnComplete={false}
      />
    </div>
  );
}