"use client";

// AflewoHorizon — original layered-silhouette sunrise illustration.
// Not derived from any existing artwork; built fresh from AFLEWO's own
// design tokens (--gold, --gold-dark, --terracotta, --brown).
export default function AflewoHorizon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="aflewo-sun" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="hsl(45, 95%, 78%)" />
          <stop offset="55%" stopColor="hsl(42, 92%, 56%)" />
          <stop offset="100%" stopColor="hsl(38, 88%, 42%)" />
        </radialGradient>

        <linearGradient id="aflewo-sky-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(20, 30%, 18%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(20, 14%, 4%)" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="aflewo-hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(38, 88%, 42%)" />
          <stop offset="100%" stopColor="hsl(30, 60%, 24%)" />
        </linearGradient>

        <linearGradient id="aflewo-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(15, 70%, 45%)" />
          <stop offset="100%" stopColor="hsl(20, 40%, 16%)" />
        </linearGradient>
      </defs>

      {/* Base backdrop — deep brown, matches existing footer background */}
      <rect x="0" y="0" width="1440" height="360" fill="hsl(20, 14%, 4%)" />

      {/* Sun disc, low on the horizon */}
      <circle cx="720" cy="210" r="150" fill="url(#aflewo-sun)" opacity="0.9" />

      {/* Scattered birds, upper third */}
      <g fill="none" stroke="hsl(42, 92%, 56%)" strokeWidth="3" strokeLinecap="round" opacity="0.6">
        <path d="M180 70 q10 -12 20 0 q10 -12 20 0" />
        <path d="M240 95 q8 -10 16 0 q8 -10 16 0" />
        <path d="M1180 60 q10 -12 20 0 q10 -12 20 0" />
        <path d="M1230 88 q8 -10 16 0 q8 -10 16 0" />
        <path d="M1080 40 q7 -9 14 0 q7 -9 14 0" />
      </g>

      {/* Farthest hill layer — lightest, gold-dark */}
      <path
        d="M0 260
           C 160 210, 340 230, 500 205
           C 660 180, 780 215, 940 195
           C 1120 172, 1300 210, 1440 190
           L 1440 360 L 0 360 Z"
        fill="url(#aflewo-hill-far)"
        opacity="0.75"
      />

      {/* Mid hill layer — terracotta */}
      <path
        d="M0 300
           C 200 260, 380 290, 560 265
           C 760 238, 900 275, 1080 255
           C 1240 238, 1360 268, 1440 250
           L 1440 360 L 0 360 Z"
        fill="url(#aflewo-hill-mid)"
        opacity="0.85"
      />

      {/* Nearest hill layer — darkest brown, sits closest to the content zone */}
      <path
        d="M0 335
           C 220 305, 420 330, 640 312
           C 860 294, 1040 320, 1240 305
           C 1340 298, 1400 312, 1440 306
           L 1440 360 L 0 360 Z"
        fill="hsl(20, 30%, 18%)"
      />

      {/* Fade to solid footer brown for the content zone below */}
      <rect x="0" y="240" width="1440" height="120" fill="url(#aflewo-sky-fade)" />
    </svg>
  );
}
