"use client";

import { events, parseEventDate, AFLEWOEvent } from "@/lib/events";
import { chapters } from "@/lib/chapters";
import Footer from "@/components/Footer";
import Link from "next/link";
import SvgIcon from "@/components/ui/SvgIcon";
import FlipClockCountdown from "@/components/ui/FlipClock";
import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { type Session } from "@supabase/supabase-js";

// ─── Spring presets (Apple Design - critically damped) ─────────────────────────
const SPRING = { type: "spring", stiffness: 360, damping: 36, mass: 0.85 } as const;
const SPRING_SLOW = { type: "spring", stiffness: 260, damping: 32, mass: 1.0 } as const;
const SPRING_SHEET = { type: "spring", stiffness: 400, damping: 40, mass: 0.9 } as const;

// ─── Constants ────────────────────────────────────────────────────────────────
const EVENT_TYPES = ["All", "Rehearsal", "Audition", "Mission", "Commissioning", "Training", "Event", "Meeting"];
const CHAPTER_NAMES = ["All Chapters", ...Array.from(new Set(events.map((e) => e.chapter))).sort()];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Chapter flag look-up for avatar cluster colours
const CHAPTER_FLAGS: Record<string, string> = {
    Nairobi: "🇰🇪", Mombasa: "🇰🇪", Nakuru: "🇰🇪", Eldoret: "🇰🇪",
    Nyeri: "🇰🇪", Meru: "🇰🇪", Machakos: "🇰🇪", Kisumu: "🇰🇪",
    Tanzania: "🇹🇿", Rwanda: "🇷🇼", Kampala: "🇺🇬",
};

// Chapter initials colours for avatar clusters on calendar (site default gold theme)
const CHAPTER_COLOUR: Record<string, string> = {
    Nairobi: "#D4AF37", Mombasa: "#D4AF37", Nakuru: "#D4AF37",
    Eldoret: "#D4AF37", Nyeri: "#D4AF37", Meru: "#D4AF37",
    Tanzania: "#D4AF37", Rwanda: "#D4AF37", Kampala: "#D4AF37",
    Machakos: "#D4AF37", Kisumu: "#D4AF37",
};

// Type pill colour tokens
function getTypeStyle(type: string) {
    switch (type) {
        case "Audition": return { pill: "bg-purple-500/12 text-purple-300 border-purple-500/20", dot: "bg-purple-400", badge: "bg-purple-500/20 text-purple-200" };
        case "Rehearsal": return { pill: "bg-blue-500/12 text-blue-300 border-blue-500/20", dot: "bg-blue-400", badge: "bg-blue-500/20 text-blue-200" };
        case "Mission": return { pill: "bg-emerald-500/12 text-emerald-300 border-emerald-500/20", dot: "bg-emerald-400", badge: "bg-emerald-500/20 text-emerald-200" };
        case "Commissioning": return { pill: "bg-yellow-500/12 text-yellow-300 border-yellow-500/20", dot: "bg-yellow-400", badge: "bg-yellow-500/20 text-yellow-200" };
        case "Training": return { pill: "bg-orange-500/12 text-orange-300 border-orange-500/20", dot: "bg-orange-400", badge: "bg-orange-500/20 text-orange-200" };
        case "Event": return { pill: "bg-pink-500/12 text-pink-300 border-pink-500/20", dot: "bg-pink-400", badge: "bg-pink-500/20 text-pink-200" };
        case "Main Event": return { pill: "bg-gold/12 text-gold border-gold/20", dot: "bg-gold", badge: "bg-gold/20 text-yellow-200" };
        case "Live Stream": return { pill: "bg-red-500/12 text-red-300 border-red-500/20", dot: "bg-red-400", badge: "bg-red-500/20 text-red-200" };
        default: return { pill: "bg-white/5 text-white/40 border-white/10", dot: "bg-white/30", badge: "bg-white/8 text-white/40" };
    }
}

function getChapterSlug(name: string): string {
    return chapters.find((c) => c.name.toLowerCase() === name.toLowerCase())?.slug ?? name.toLowerCase();
}

// Format a date as "21 DEC" for the floating stub on cards
function formatDateStub(dateStr: string): string {
    if (!dateStr || dateStr === "TBD" || dateStr === "Every Night") return dateStr ?? "-";
    const parts = dateStr.replace(",", "").split(" ");
    if (parts.length >= 2) return `${parts[1]} ${parts[0].toUpperCase()}`;
    return dateStr;
}

// ─── Responsive Cascading Button ──────────────────────────────────────────────
interface CascadingButtonProps {
    onClick?: (e: React.MouseEvent) => void;
    icon: string;
    text: string;
    title: string;
    href?: string;
    target?: string;
}

function CascadingButton({ onClick, icon, text, title, href, target }: CascadingButtonProps) {
    const content = (
        <span className="flex items-center justify-center gap-1.5 min-h-[16px]">
            {/* Desktop: icon + text */}
            <span className="hidden md:flex items-center gap-1.5 font-black">
                <SvgIcon name={icon} size={11} className="text-gold" />
                <span>{text}</span>
            </span>
            {/* Tablet: text alone */}
            <span className="hidden sm:inline md:hidden font-bold">
                {text}
            </span>
            {/* Mobile: icon alone */}
            <span className="inline sm:hidden">
                <SvgIcon name={icon} size={11} className="text-gold" />
            </span>
        </span>
    );

    const className = "px-3 py-2 rounded-xl bg-white/4 hover:bg-gold/15 border border-white/4 hover:border-gold/20 text-white/50 hover:text-gold text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center";

    if (href) {
        return (
            <a
                href={href}
                target={target}
                rel={target ? "noopener noreferrer" : undefined}
                onClick={onClick}
                className={className}
                title={title}
            >
                {content}
            </a>
        );
    }

    return (
        <button
            onClick={onClick}
            className={className}
            title={title}
        >
            {content}
        </button>
    );
}

// ─── Portrait Event Card (Panel B) ────────────────────────────────────────────
function PortraitEventCard({
    event,
    past,
    selected,
    onSelect,
    delay = 0,
}: {
    event: AFLEWOEvent;
    past: boolean;
    selected: boolean;
    onSelect: (ev: AFLEWOEvent) => void;
    delay?: number;
}) {
    const shouldReduceMotion = useReducedMotion();
    const s = getTypeStyle(event.type);
    const chapterColour = CHAPTER_COLOUR[event.chapter] ?? "#D4AF37";
    const stub = formatDateStub(event.date);

    const handleAddToCalendar = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!event.start || !event.end) return;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("AFLEWO: " + event.title)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.description ?? "")}&location=${encodeURIComponent(event.location)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <motion.div
            layoutId={`event-card-${event.id}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={shouldReduceMotion ? { duration: 0.18 } : { ...SPRING_SLOW, delay }}
            whileHover={past ? {} : { y: -5 }}
            onClick={() => onSelect(event)}
            className={`group relative rounded-[1.75rem] border overflow-hidden flex flex-col cursor-pointer transition-all ${past
                ? "border-white/4 opacity-45"
                : selected
                    ? "border-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.18)]"
                    : "border-white/6 hover:border-white/12"
                }`}
            style={{ background: "rgba(255,255,255,0.018)", backdropFilter: "blur(20px)" }}
        >
            {/* Portrait image area */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
                {event.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(135deg, ${chapterColour}22 0%, #0A0706 100%)`,
                        }}
                    />
                )}
                {/* Dark vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Floating date stub - top right */}
                <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/80 leading-none">{stub}</p>
                </div>

                {/* Chapter flag/avatar - top left */}
                <div
                    className="absolute top-3 left-3 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black shadow-lg"
                    style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
                    title={event.chapter}
                >
                    {CHAPTER_FLAGS[event.chapter] ?? event.chapter[0]}
                </div>

                {/* Type pill overlay */}
                <div className="absolute bottom-3 left-3">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] border ${s.pill}`}>
                        {event.type}
                    </span>
                </div>

                {/* Live badge */}
                {event.isLive && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/90 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white">Live</span>
                    </div>
                )}
            </div>

            {/* Text content */}
            <div className="p-4 flex flex-col gap-3 flex-1 relative z-10">
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-gold/60">{event.chapter}</p>
                    <h3 className="text-[13px] font-black tracking-tight text-white leading-snug mt-0.5 group-hover:text-gold transition-colors duration-300 line-clamp-2">
                        {event.title}
                    </h3>
                </div>

                <div className="flex items-center gap-1.5 text-white/30">
                    <SvgIcon name="location_on" size={10} className="text-gold/40 shrink-0" />
                    <span className="text-[9px] font-bold tracking-wide truncate">{event.location}</span>
                </div>

                {/* Cascading actions row */}
                <div className="mt-auto flex items-center gap-1.5 pt-2 border-t border-white/4">
                    {event.lat && event.lng && (
                        <CascadingButton
                            href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                            target="_blank"
                            icon="location"
                            text="Map"
                            title="Open in Google Maps"
                        />
                    )}
                    {event.start && !past && (
                        <CascadingButton
                            onClick={handleAddToCalendar}
                            icon="event"
                            text="Calendar"
                            title="Add to Google Calendar"
                        />
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(event); }}
                        className="ml-auto text-[8px] font-black uppercase tracking-[0.18em] text-white/25 hover:text-gold transition-colors flex items-center gap-1"
                    >
                        Details <SvgIcon name="arrow_forward" size={9} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Horizontal Event Row Card (list view fallback) ───────────────────────────
function EventRowCard({
    event,
    past,
    selected,
    onSelect,
    delay = 0,
}: {
    event: AFLEWOEvent;
    past: boolean;
    selected: boolean;
    onSelect: (ev: AFLEWOEvent) => void;
    delay?: number;
}) {
    const shouldReduceMotion = useReducedMotion();
    const s = getTypeStyle(event.type);
    const chapterColour = CHAPTER_COLOUR[event.chapter] ?? "#D4AF37";

    const handleAddToCalendar = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!event.start || !event.end) return;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("AFLEWO: " + event.title)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.description ?? "")}&location=${encodeURIComponent(event.location)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <motion.div
            layoutId={`event-row-${event.id}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -12, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : { ...SPRING_SLOW, delay }}
            onClick={() => onSelect(event)}
            className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${past
                ? "border-white/3 opacity-45"
                : selected
                    ? "border-gold/35 bg-gold/5"
                    : "border-white/5 hover:border-white/10 hover:bg-white/2"
                }`}
            style={{ background: selected ? "rgba(212,175,55,0.04)" : "rgba(255,255,255,0.014)" }}
        >
            {/* Optional dynamic image preview or Date badge */}
            {event.imageUrl ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-[10px] font-black text-white">{event.date === "Every Night" ? "∞" : event.date === "TBD" ? "?" : event.date.split(" ")[1]?.replace(",", "") ?? "-"}</span>
                    </div>
                </div>
            ) : (
                <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center shrink-0 border"
                    style={{ background: `${chapterColour}18`, borderColor: `${chapterColour}30` }}
                >
                    <span className="text-[15px] font-black leading-none text-gold">
                        {event.date === "Every Night" ? "∞" : event.date === "TBD" ? "?" : event.date.split(" ")[1]?.replace(",", "") ?? "-"}
                    </span>
                    <span className="text-[7px] font-black uppercase tracking-wide text-gold/70">
                        {event.date === "Every Night" ? "NIGHTLY" : event.date === "TBD" ? "TBD" : event.date.split(" ")[0]}
                    </span>
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-gold/50">{event.chapter}</p>
                <h4 className="text-[13px] font-black text-white group-hover:text-gold transition-colors leading-tight truncate mt-0.5">
                    {event.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-[0.15em] border ${s.pill}`}>
                        {event.type}
                    </span>
                    {event.isLive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20 text-red-300 text-[7px] font-black uppercase tracking-[0.15em]">
                            <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                            Live
                        </span>
                    )}
                </div>
            </div>

            {/* Cascading responsive actions */}
            <div className="flex items-center gap-1.5 shrink-0">
                {event.lat && event.lng && (
                    <CascadingButton
                        href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                        target="_blank"
                        icon="location"
                        text="Map"
                        title="Open Map"
                    />
                )}
                {event.start && !past && (
                    <CascadingButton
                        onClick={handleAddToCalendar}
                        icon="event"
                        text="Calendar"
                        title="Add to Calendar"
                    />
                )}
            </div>
        </motion.div>
    );
}

// ─── Attendee Avatar Cluster (Panel A) ─────────────────────────────────────────
function AvatarCluster({ dayEvents }: { dayEvents: AFLEWOEvent[] }) {
    const visible = dayEvents.slice(0, 3);
    const overflow = dayEvents.length - 3;
    return (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center">
            <div className="flex -space-x-0.5">
                {visible.map((ev, idx) => (
                    <div
                        key={ev.id}
                        title={`${ev.chapter} - ${ev.title}`}
                        className="w-[9px] h-[9px] rounded-full border border-black/50 shrink-0"
                        style={{
                            background: CHAPTER_COLOUR[ev.chapter] ?? "#D4AF37",
                            zIndex: visible.length - idx,
                        }}
                    />
                ))}
                {overflow > 0 && (
                    <div
                        className="w-[9px] h-[9px] rounded-full border border-black/50 bg-white/20 flex items-center justify-center text-[4px] font-black text-white/60"
                        style={{ zIndex: 0 }}
                    >
                        +{overflow}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Today Indicator (Panel A) ─────────────────────────────────────────────────
// Hollow gold ring when today has no events, filled gold dot when today has events.
// Renders in place of AvatarCluster on today's cell specifically.
function TodayDot({ hasEvents }: { hasEvents: boolean }) {
    return (
        <span
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full ${hasEvents ? "bg-gold" : "bg-transparent border border-gold"
                }`}
        />
    );
}

// ─── Panel A - Calendar Widget ─────────────────────────────────────────────────
function CalendarPanel({
    currentMonth, selectedDate,
    onMonthChange, onDaySelect,
    session,
}: {
    currentMonth: Date; selectedDate: Date | null;
    onMonthChange: (dir: number) => void; onDaySelect: (d: Date | null) => void;
    session: Session | null;
}) {
    const shouldReduceMotion = useReducedMotion();
    const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const getFirstDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const getEventsForDate = useCallback((d: Date) => events.filter((e) => {
        if (e.visibility === "member" && !session) return false;
        const ed = parseEventDate(e.date);
        return ed && ed.toDateString() === d.toDateString();
    }), [session]);

    const today = new Date().toDateString();

    return (
        <div
            className="rounded-[2rem] border border-white/8 p-5"
            style={{ background: "rgba(255,255,255,0.022)", backdropFilter: "blur(24px) saturate(180%)" }}
        >
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
                <motion.button whileTap={{ scale: 0.9 }} transition={SPRING} onClick={() => onMonthChange(-1)} className="w-8 h-8 rounded-full flex items-center justify-center border border-white/8 hover:border-gold/30 hover:bg-gold/10 transition-colors">
                    <SvgIcon name="arrow_left" size={16} />
                </motion.button>
                <h3 className="text-[13px] font-black tracking-tight">
                    {MONTHS[currentMonth.getMonth()].slice(0, 3)} <span className="text-gold">{currentMonth.getFullYear()}</span>
                </h3>
                <motion.button whileTap={{ scale: 0.9 }} transition={SPRING} onClick={() => onMonthChange(1)} className="w-8 h-8 rounded-full flex items-center justify-center border border-white/8 hover:border-gold/30 hover:bg-gold/10 transition-colors">
                    <SvgIcon name="arrow_right" size={16} />
                </motion.button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((d, i) => (
                    <div key={`wd-${i}`} className="text-center text-[8px] font-black uppercase tracking-[0.18em] text-white/20 py-1.5">{d}</div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDay(currentMonth) }).map((_, i) => (
                    <div key={`e-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                    const dayEvents = getEventsForDate(date);
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = today === date.toDateString();
                    return (
                        <motion.button
                            key={i}
                            whileTap={{ scale: 0.86 }}
                            transition={SPRING}
                            onClick={() => onDaySelect(isSelected ? null : date)}
                            className={`relative aspect-square w-full rounded-[28%] text-[11px] font-semibold tracking-tight transition-colors duration-200 flex flex-col items-center justify-center gap-0.5 ${isSelected
                                ? "bg-gold text-brown shadow-[0_2px_10px_rgba(212,175,55,0.45)]"
                                : isToday
                                    ? "bg-white/10 text-white ring-1 ring-white/25"
                                    : hasEvents
                                        ? "bg-white/[0.04] hover:bg-white/[0.08] text-white"
                                        : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
                                }`}
                            style={{ WebkitTapHighlightColor: "transparent" }}
                        >
                            <span className="leading-none">{i + 1}</span>

                            {/* Today: hollow ring (no events) or filled dot (events), takes priority over AvatarCluster */}
                            {isToday && !isSelected && (
                                <TodayDot hasEvents={hasEvents} />
                            )}

                            {/* Non-today with events: chapter avatar cluster */}
                            {hasEvents && !isSelected && !isToday && (
                                <AvatarCluster dayEvents={dayEvents} />
                            )}

                            {/* Selected day with events: small brown dot fallback for contrast on gold */}
                            {hasEvents && isSelected && (
                                <span className="w-1 h-1 rounded-full bg-brown/70" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Clear selection */}
            <AnimatePresence>
                {selectedDate && (
                    <motion.button
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={SPRING}
                        onClick={() => onDaySelect(null)}
                        className="mt-4 w-full py-2.5 rounded-xl border border-white/8 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white hover:border-white/20 flex items-center justify-center gap-2 transition-colors"
                    >
                        <SvgIcon name="close" size={12} /> Clear Selection
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Panel C - Sticky Details Sidebar ─────────────────────────────────────────
type DetailTab = "schedule" | "about" | "hosts";

function DetailPanel({ event, onClose, session }: { event: AFLEWOEvent | null; onClose?: () => void; session: Session | null }) {
    const shouldReduceMotion = useReducedMotion();
    const [activeTab, setActiveTab] = useState<DetailTab>("schedule");
    const [ctaPressed, setCtaPressed] = useState(false);
    const chapterColour = event ? (CHAPTER_COLOUR[event.chapter] ?? "#D4AF37") : "#D4AF37";
    const s = event ? getTypeStyle(event.type) : null;
    const chapterData = event ? chapters.find(c => c.name.toLowerCase() === event.chapter.toLowerCase()) : null;

    useEffect(() => {
        setActiveTab("schedule");
        setCtaPressed(false);
    }, [event?.id]);

    const handleAddToCalendar = () => {
        if (!event || !event.start || !event.end) return;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("AFLEWO: " + event.title)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.description ?? "")}&location=${encodeURIComponent(event.location)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    // Resolve the event date for "is this upcoming?"
    const eventDate = event ? parseEventDate(event.date) : null;
    const isUpcoming = eventDate ? eventDate >= new Date() : (event?.date === "Every Night");
    const isPast = eventDate ? eventDate < new Date() : false;

    if (!event) {
        return (
            <div
                className="rounded-[2rem] border border-white/6 flex flex-col items-center justify-center py-20 px-6 text-center gap-4 h-full min-h-[400px]"
                style={{ background: "rgba(255,255,255,0.014)", backdropFilter: "blur(20px)" }}
            >
                <div className="w-16 h-16 rounded-full bg-white/4 border border-white/8 flex items-center justify-center">
                    <SvgIcon name="calendar" size={24} className="text-white/15" />
                </div>
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">Select an event to view details</p>
            </div>
        );
    }

    // Schedule timeline entries derived from event data
    const scheduleItems = [
        event.time !== "TBD" && { time: event.time, label: "Doors Open / Registration" },
        { time: "-", label: event.title },
        event.date !== "TBD" && event.date !== "Every Night" && { time: "End", label: `${event.venueName ?? event.location}` },
    ].filter(Boolean) as { time: string; label: string }[];

    return (
        <motion.div
            key={event.id}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98 }}
            transition={SPRING_SLOW}
            className="rounded-[2rem] border border-white/8 overflow-hidden flex flex-col relative"
            style={{ background: "rgba(255,255,255,0.018)", backdropFilter: "blur(24px) saturate(160%)" }}
        >
            {/* Hero banner */}
            <div className="relative h-32 overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(135deg, ${chapterColour}40 0%, ${chapterColour}10 60%, #0A0706 100%)`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />

                {/* Close on mobile */}
                {onClose && (
                    <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors z-10">
                        <SvgIcon name="close" size={14} />
                    </button>
                )}

                {/* Overlay metadata */}
                <div className="absolute bottom-3 left-4 right-4 z-10">
                    <div className="flex items-center gap-2">
                        {s && <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-[0.18em] border ${s.pill}`}>{event.type}</span>}
                        {event.isLive && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/80 text-white text-[7px] font-black uppercase tracking-[0.15em]">
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />Live
                            </span>
                        )}
                        {event.visibility === "member" && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/50 text-[7px] font-black uppercase tracking-[0.15em]">
                                <SvgIcon name="lock" size={8} /> Members
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Title block */}
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gold/60">{event.chapter}</p>
                    <h3 className="text-[17px] font-black tracking-tight text-white leading-tight mt-1">{event.title}</h3>
                </div>

                {/* Meta pills */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/2">
                        <SvgIcon name="location_on" size={12} className="text-gold/50 shrink-0" />
                        <span className="text-[10px] font-bold text-white/60 leading-tight">{event.location}</span>
                    </div>
                    {event.date !== "TBD" && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/2">
                            <SvgIcon name="calendar" size={12} className="text-gold/50 shrink-0" />
                            <span className="text-[10px] font-bold text-white/60">{event.date}</span>
                            {event.time !== "TBD" && <span className="text-[9px] font-black text-white/30 ml-1">· {event.time}</span>}
                        </div>
                    )}
                    {/* External map link */}
                    {event.lat && event.lng && (
                        <a
                            href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/2 hover:border-gold/20 hover:bg-gold/5 transition-all group"
                        >
                            <SvgIcon name="location" size={12} className="text-gold/40 group-hover:text-gold shrink-0 transition-colors" />
                            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35 group-hover:text-gold transition-colors">Open in Google Maps</span>
                            <SvgIcon name="arrow_forward" size={9} className="ml-auto text-white/20 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
                        </a>
                    )}
                </div>

                {/* Tab switcher */}
                <div className="flex p-1 rounded-xl border border-white/6 bg-white/2 gap-0.5">
                    {(["schedule", "about", "hosts"] as DetailTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.18em] transition-all ${activeTab === tab ? "bg-gold text-brown shadow-sm" : "text-white/30 hover:text-white"
                                }`}
                        >
                            {tab === "schedule" ? "Schedule" : tab === "about" ? "About" : "Hosts"}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    {activeTab === "schedule" && (
                        <motion.div key="schedule" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING} className="space-y-2">
                            {scheduleItems.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-5 h-5 rounded-full border border-gold/30 bg-gold/10 flex items-center justify-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                        </div>
                                        {idx < scheduleItems.length - 1 && <div className="w-px h-5 bg-gradient-to-b from-gold/20 to-transparent" />}
                                    </div>
                                    <div className="pb-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gold/50">{item.time}</p>
                                        <p className="text-[11px] font-bold text-white/70 mt-0.5 leading-tight">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "about" && (
                        <motion.div key="about" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING}>
                            <p className="text-[11px] text-white/50 leading-relaxed">
                                {event.description ?? "No description available for this event."}
                            </p>
                            {chapterData?.description && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/25 mb-1.5">About {event.chapter} Chapter</p>
                                    <p className="text-[10px] text-white/35 leading-relaxed line-clamp-4">{chapterData.description}</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "hosts" && (
                        <motion.div key="hosts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING} className="space-y-3">
                            {/* Chapter host card */}
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
                                <div
                                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg font-black shrink-0"
                                    style={{ borderColor: `${chapterColour}60`, background: `${chapterColour}22` }}
                                >
                                    {CHAPTER_FLAGS[event.chapter] ?? event.chapter[0]}
                                </div>
                                <div>
                                    <p className="text-[12px] font-black text-white">AFLEWO {event.chapter}</p>
                                    <p className="text-[9px] font-bold text-white/35 uppercase tracking-[0.15em]">{chapterData?.status ?? "Chapter"} · Est. {chapterData?.established ?? "-"}</p>
                                </div>
                            </div>
                            {chapterData?.contactEmail && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/2">
                                    <SvgIcon name="mail" size={11} className="text-gold/40 shrink-0" />
                                    <span className="text-[9px] font-bold text-white/40">{chapterData.contactEmail}</span>
                                </div>
                            )}
                            {chapterData?.contactPhone && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/5 bg-white/2">
                                    <SvgIcon name="phone" size={11} className="text-gold/40 shrink-0" />
                                    <span className="text-[9px] font-bold text-white/40">{chapterData.contactPhone}</span>
                                </div>
                            )}
                            <Link
                                href={`/chapters/${getChapterSlug(event.chapter)}`}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/8 text-[9px] font-black uppercase tracking-[0.18em] text-white/35 hover:text-gold hover:border-gold/20 transition-all"
                            >
                                <SvgIcon name="groups" size={12} />View Chapter
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sticky CTA */}
                <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
                    {isUpcoming && !isPast ? (
                        <>
                            {event.start && (
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    transition={SPRING}
                                    onClick={handleAddToCalendar}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gold text-brown font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_0_24px_rgba(212,175,55,0.2)] relative overflow-hidden"
                                >
                                    {/* Shimmer sweep */}
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />
                                    <SvgIcon name="event" size={14} />
                                    + Add to Calendar
                                </motion.button>
                            )}
                            {(event.url || chapterData?.link) && (
                                <a
                                    href={event.url ?? chapterData?.link ?? "/join"}
                                    target={event.url?.startsWith("http") ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gold/20 text-gold font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gold/8 transition-all"
                                >
                                    <SvgIcon name="check_circle" size={14} />
                                    Register / Join
                                </a>
                            )}
                        </>
                    ) : event.isLive && event.url ? (
                        <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 transition-all"
                        >
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Watch Live Now
                        </a>
                    ) : isPast ? (
                        <div className="w-full py-3 rounded-2xl border border-white/8 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                            Past Event · Archive
                        </div>
                    ) : (
                        <Link
                            href="/join"
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gold text-brown font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 active:scale-[0.99] transition-all"
                        >
                            <SvgIcon name="group_add" size={14} />
                            Join the Movement
                        </Link>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Flagship Countdown Banner ─────────────────────────────────────────────────
const FLAGSHIP_DATE = new Date("2026-10-02T18:00:00+03:00");

function FlagshipCountdown() {
    const [diff, setDiff] = useState(FLAGSHIP_DATE.getTime() - Date.now());
    useEffect(() => {
        const id = setInterval(() => setDiff(Math.max(0, FLAGSHIP_DATE.getTime() - Date.now())), 1000);
        return () => clearInterval(id);
    }, []);
    if (diff <= 0) return null;
    return (
        <div
            className="rounded-[1.75rem] border border-white/5 relative overflow-hidden"
            style={{ background: "rgba(20,16,12,0.9)", backdropFilter: "blur(24px) saturate(160%)" }}
        >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />
            <div className="relative z-10 p-10 md:p-14 flex flex-col items-center text-center">
                <div className="space-y-3 mb-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gold/80">Next Event Countdown</span>
                    <h2 className="font-black tracking-tighter leading-[0.9] text-white" style={{ fontSize: "clamp(2rem,4vw,3.5rem)", letterSpacing: "-0.04em" }}>
                        Alumni Connect
                    </h2>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.25em]">Nairobi · Aug 07, 2026</p>
                </div>
                <div className="mb-12">
                    <FlipClockCountdown targetDate={new Date("2026-08-07T18:00:00+03:00")} />
                </div>
                <Link href="/join" className="w-full flex items-center justify-center gap-2 py-4 bg-gold text-brown rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-[0.99] shadow-[0_4px_24px_rgba(212,175,55,0.15)]">
                    <SvgIcon name="check_circle" size={16} />
                    Register Now
                </Link>
            </div>
        </div>
    );
}

// ─── Discovery Rails (Trending / Category / Near Chapter) ─────────────────────
function DiscoveryRails({ onSelect, session, typeFilter, setTypeFilter }: {
    onSelect: (ev: AFLEWOEvent) => void; session: Session | null;
    typeFilter: string; setTypeFilter: (t: string) => void;
}) {
    const now = new Date();
    // Trending: highest upcoming event count per chapter
    const chapterCounts = useMemo(() => {
        const map: Record<string, AFLEWOEvent[]> = {};
        events.forEach(e => {
            if (e.visibility === "member" && !session) return;
            const d = parseEventDate(e.date);
            if (d && d >= now) {
                if (!map[e.chapter]) map[e.chapter] = [];
                map[e.chapter].push(e);
            }
        });
        return Object.entries(map).sort((a, b) => b[1].length - a[1].length).slice(0, 4);
    }, [session]);

    return (
        <div className="space-y-5">
            {/* Category filter pills */}
            <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">Browse by Category</p>
                <div className="flex flex-wrap gap-1.5">
                    {EVENT_TYPES.map((t) => (
                        <motion.button
                            key={t}
                            whileTap={{ scale: 0.93 }}
                            transition={SPRING}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] border border-separate:0 border:1 border-opacity-50 transition-all ${typeFilter === t ? "bg-gold text-brown border-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]" : "border-white/8 text-white/35 hover:border-white/20 hover:text-white/70"
                                }`}
                        >
                            {t}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Trending chapters */}
            {chapterCounts.length > 0 && (
                <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">Trending · Most Events</p>
                    <div className="grid grid-cols-2 gap-2">
                        {chapterCounts.map(([chapter, evs]) => {
                            const colour = CHAPTER_COLOUR[chapter] ?? "#D4AF37";
                            const next = evs[0];
                            return (
                                <motion.button
                                    key={chapter}
                                    whileTap={{ scale: 0.96 }}
                                    transition={SPRING}
                                    onClick={() => next && onSelect(next)}
                                    className="flex items-center gap-2.5 p-3 rounded-2xl border border-white/5 hover:border-white/12 text-left transition-all group"
                                    style={{ background: `${colour}0A` }}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center text-center justify-center text-sm font-black shrink-0"
                                        style={{ borderColor: `${colour}40`, background: `${colour}22` }}>
                                        {CHAPTER_FLAGS[chapter] ?? chapter[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-white truncate group-hover:text-gold transition-colors">{chapter}</p>
                                        <p className="text-[8px] font-bold text-white/30">{evs.length} upcoming</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Inner page (uses useSearchParams - requires Suspense) ─────────────────────
function EventsInner() {
    const shouldReduceMotion = useReducedMotion();
    const searchParams = useSearchParams();
    const defaultChapter = searchParams.get("chapter") ?? "All Chapters";

    // Auth
    const [session, setSession] = useState<Session | null>(null);
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: auth } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
        return () => auth.subscription.unsubscribe();
    }, []);

    // Filters
    const [typeFilter, setTypeFilter] = useState("All");
    const [chapterFilter, setChapterFilter] = useState(defaultChapter);
    const [showPast, setShowPast] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Selected event for detail panel
    const [selectedEvent, setSelectedEvent] = useState<AFLEWOEvent | null>(null);
    const [showMobileDetail, setShowMobileDetail] = useState(false);

    // View mode: "grid" (portrait cards) or "list" (rows) in Panel B
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Chapter filter pill scrollable ref
    const chapterScrollRef = useRef<HTMLDivElement>(null);

    const handleSelectEvent = useCallback((ev: AFLEWOEvent) => {
        setSelectedEvent(ev);
        setShowMobileDetail(true);
    }, []);

    const handleDaySelect = useCallback((d: Date | null) => {
        setSelectedDate(d);
        // Clear event selection when changing date
    }, []);

    const navigateMonth = useCallback((dir: number) => {
        setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    }, []);

    const { upcoming, past } = useMemo(() => {
        if (!mounted) return { upcoming: [], past: [] };
        const now = new Date();
        const sorted = [...events].sort((a, b) => {
            const da = parseEventDate(a.date);
            const db = parseEventDate(b.date);
            if (!da) return 1;
            if (!db) return -1;
            return da.getTime() - db.getTime();
        });
        const matchFilter = (e: AFLEWOEvent) =>
            (e.visibility !== "member" || session) &&
            (typeFilter === "All" || e.type === typeFilter) &&
            (chapterFilter === "All Chapters" || e.chapter === chapterFilter) &&
            (!selectedDate || (() => { const d = parseEventDate(e.date); return d && d.toDateString() === selectedDate.toDateString(); })());

        const u: AFLEWOEvent[] = [];
        const p: AFLEWOEvent[] = [];
        sorted.forEach((e) => {
            if (!matchFilter(e)) return;
            const d = parseEventDate(e.date);
            if (!d || d >= now || e.date === "Every Night") u.push(e);
            else p.push(e);
        });
        return { upcoming: u, past: p.reverse() };
    }, [typeFilter, chapterFilter, selectedDate, session, mounted]);

    const stagger = (i: number) => shouldReduceMotion ? { duration: 0.15 } : { ...SPRING_SLOW, delay: i * 0.045 };

    return (
        <>
            {/* ── Hero header ── */}
            <section className="pt-36 pb-10 px-6 border-b border-white/4 relative overflow-hidden">
                <div className="absolute top-[-25%] right-[5%] w-[600px] h-[500px] rounded-full bg-gold/4 blur-[140px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[15%] w-[400px] h-[300px] rounded-full bg-purple-500/4 blur-[110px] pointer-events-none" />

                <div className="max-container relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={stagger(0)}
                            className="space-y-4"
                        >
                            <span className="inline-block text-gold font-black uppercase tracking-[0.4em] text-[9px]">2026 Season Calendar</span>
                            <h1 className="font-black tracking-tighter leading-[0.85] text-white" style={{ fontSize: "clamp(3rem,9vw,7rem)" }}>
                                IT'S ALL<br />
                                ABOUT <span className="text-gold">EVENTS.</span>
                            </h1>
                            <p className="text-white/35 max-w-md font-bold text-[10px] uppercase tracking-[0.2em] leading-relaxed pt-1">
                                {upcoming.length} upcoming events across {new Set(events.map(e => e.chapter)).size} chapters - rehearsals, auditions, missions, and worship nights.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(1)}
                            className="grid grid-cols-3 gap-3 shrink-0"
                        >
                            {[
                                { label: "Total Events", value: `${events.length}` },
                                { label: "Upcoming", value: `${upcoming.length}` },
                                { label: "Chapters", value: `${new Set(events.map(e => e.chapter)).size}` },
                            ].map((s) => (
                                <div key={s.label} className="p-5 rounded-[1.5rem] border border-white/5 text-center" style={{ background: "rgba(255,255,255,0.018)", backdropFilter: "blur(16px)" }}>
                                    <p className="text-3xl font-black text-gold tracking-tight">{s.value}</p>
                                    <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/25 mt-1">{s.label}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={stagger(2)}
                        className="mt-10 flex flex-wrap gap-3"
                    >
                        {[
                            { href: "/chapters", icon: "groups", label: "All Chapters" },
                            { href: "/media", icon: "photo_library", label: "Media Archive" },
                        ].map(({ href, icon, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/5 hover:border-gold/25 hover:bg-white/4 text-white/40 hover:text-gold text-[9px] font-black uppercase tracking-[0.18em] active:scale-95 transition-all"
                                style={{ background: "rgba(255,255,255,0.018)", backdropFilter: "blur(12px)" }}
                            >
                                <SvgIcon name={icon} size={13} /> {label}
                            </Link>
                        ))}
                        <Link href="/join" className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gold text-brown rounded-xl text-[9px] font-black uppercase tracking-[0.18em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.12)]">
                            <SvgIcon name="group_add" size={13} /> Join the Movement
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── Flagship Countdown ── */}
            <section className="px-6 py-10">
                <div className="max-container">
                    <FlagshipCountdown />
                </div>
            </section>

            {/* ── Sticky top filter bar ── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.2 }}
                className="sticky top-0 z-30 border-b border-white/4 px-6 py-3"
                style={{ background: "rgba(10,8,6,0.85)", backdropFilter: "blur(28px) saturate(180%)" }}
            >
                <div className="max-container flex flex-wrap items-center gap-2">
                    {/* Chapter pill row */}
                    <div ref={chapterScrollRef} className="flex overflow-x-auto hide-scrollbar gap-1 p-1 rounded-full border border-white/5 bg-white/2 flex-1 min-w-0">
                        {CHAPTER_NAMES.map((c) => (
                            <button
                                key={c}
                                onClick={() => setChapterFilter(c)}
                                className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] transition-all whitespace-nowrap ${chapterFilter === c ? "bg-white/15 text-white border border-white/8" : "text-white/25 hover:text-white hover:bg-white/5 border border-transparent"}`}
                            >
                                {c === "All Chapters" ? "All" : c}
                            </button>
                        ))}
                    </div>

                    {/* View mode toggle */}
                    <div className="flex gap-1 p-1 rounded-full border border-white/5 bg-white/2 shrink-0">
                        {(["grid", "list"] as const).map((m) => (
                            <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.18em] transition-all ${viewMode === m ? "bg-gold text-brown" : "text-white/25 hover:text-white"}`}>
                                {m === "grid" ? "Grid" : "List"}
                            </button>
                        ))}
                    </div>

                    {/* Past toggle */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        transition={SPRING}
                        onClick={() => setShowPast(v => !v)}
                        className={`shrink-0 px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-[0.18em] border transition-all ${showPast ? "bg-white/8 border-white/15 text-white/60" : "border-white/6 text-white/25 hover:text-white/45"}`}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                        {showPast ? "Hide Past" : "Past"}
                    </motion.button>
                </div>

                {/* Count line */}
                <div className="max-container mt-2 flex items-center gap-3">
                    <div className="h-px bg-white/8 flex-1" />
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">{upcoming.length} upcoming · {past.length} past</p>
                    <div className="h-px bg-white/8 flex-1" />
                </div>
            </motion.div>

            {/* ── THREE-PANEL WORKSPACE ── */}
            <section className="px-6 py-10">
                <div className="max-container">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                        {/* ── PANEL A - Calendar + Discovery (Left) ── */}
                        <div className="xl:col-span-3 space-y-5">
                            <CalendarPanel
                                currentMonth={currentMonth}
                                selectedDate={selectedDate}
                                onMonthChange={navigateMonth}
                                onDaySelect={handleDaySelect}
                                session={session}
                            />

                            {/* Chapter filters */}
                            <div
                                className="rounded-[2rem] border border-white/8 p-5 space-y-4"
                                style={{ background: "rgba(255,255,255,0.016)", backdropFilter: "blur(20px)" }}
                            >
                                <DiscoveryRails
                                    onSelect={handleSelectEvent}
                                    session={session}
                                    typeFilter={typeFilter}
                                    setTypeFilter={setTypeFilter}
                                />
                            </div>
                        </div>

                        {/* ── PANEL B - Event Card Stream (Center) ── */}
                        <div className="xl:col-span-5 space-y-5">
                            {/* Section label */}
                            <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] animate-pulse" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/70">
                                    {selectedDate
                                        ? `Events on ${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                        : "Upcoming Events"}
                                </h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-gold/15 to-transparent" />
                            </div>

                            <AnimatePresence mode="wait">
                                {upcoming.length === 0 ? (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={SPRING}
                                        className="text-center py-28 space-y-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/4 border border-white/8 flex items-center justify-center mx-auto">
                                            <SvgIcon name="event_busy" size={28} className="text-white/18" />
                                        </div>
                                        <p className="text-white/25 font-black uppercase tracking-[0.2em] text-[10px]">No upcoming events for this filter</p>
                                    </motion.div>
                                ) : viewMode === "grid" ? (
                                    <motion.div key="grid" className="grid grid-cols-2 gap-4">
                                        {upcoming.map((ev, i) => (
                                            <PortraitEventCard
                                                key={ev.id}
                                                event={ev}
                                                past={false}
                                                selected={selectedEvent?.id === ev.id}
                                                onSelect={handleSelectEvent}
                                                delay={i * 0.04}
                                            />
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div key="list" className="space-y-2">
                                        {upcoming.map((ev, i) => (
                                            <EventRowCard
                                                key={ev.id}
                                                event={ev}
                                                past={false}
                                                selected={selectedEvent?.id === ev.id}
                                                onSelect={handleSelectEvent}
                                                delay={i * 0.035}
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Past events */}
                            <AnimatePresence>
                                {showPast && past.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={SPRING}
                                        className="overflow-hidden space-y-5"
                                    >
                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="w-2 h-2 rounded-full bg-white/15" />
                                            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Past Events</h2>
                                            <div className="flex-1 h-px bg-gradient-to-r from-white/8 to-transparent" />
                                        </div>
                                        {viewMode === "grid" ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                {past.map((ev, i) => (
                                                    <PortraitEventCard
                                                        key={ev.id}
                                                        event={ev}
                                                        past={true}
                                                        selected={selectedEvent?.id === ev.id}
                                                        onSelect={handleSelectEvent}
                                                        delay={i * 0.03}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {past.map((ev, i) => (
                                                    <EventRowCard key={ev.id} event={ev} past={true} selected={selectedEvent?.id === ev.id} onSelect={handleSelectEvent} delay={i * 0.025} />
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── PANEL C - Sticky Detail (Right, desktop only) ── */}
                        <div className="hidden xl:block xl:col-span-4">
                            <div className="sticky top-28">
                                <AnimatePresence mode="wait">
                                    <DetailPanel
                                        key={selectedEvent?.id ?? "empty"}
                                        event={selectedEvent}
                                        session={session}
                                    />
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Mobile Detail Bottom Sheet (Panel C) ── */}
            <AnimatePresence>
                {showMobileDetail && selectedEvent && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
                            onClick={() => setShowMobileDetail(false)}
                        />
                        {/* Sheet */}
                        <motion.div
                            key="sheet"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={SPRING_SHEET}
                            className="fixed bottom-0 left-0 right-0 z-50 xl:hidden rounded-t-[2.5rem] overflow-hidden max-h-[88vh] overflow-y-auto"
                            style={{ background: "rgba(10,8,6,0.98)", backdropFilter: "blur(32px)" }}
                        >
                            {/* Pull handle */}
                            <div className="sticky top-0 flex justify-center pt-3 pb-2 bg-transparent z-10">
                                <div className="w-10 h-1 rounded-full bg-white/15" />
                            </div>
                            <div className="px-4 pb-8">
                                <DetailPanel
                                    event={selectedEvent}
                                    onClose={() => setShowMobileDetail(false)}
                                    session={session}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── CTA section ── */}
            <section className="px-6 py-20 border-t border-white/4 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-[500px] h-[250px] bg-gold/4 blur-[120px] pointer-events-none rounded-tl-[100%]" />
                <div className="max-container relative z-10">
                    <div
                        className="rounded-[2rem] border border-gold/12 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10"
                        style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.01) 100%)", backdropFilter: "blur(24px)" }}
                    >
                        <div className="space-y-4 text-center md:text-left">
                            <span className="inline-block text-gold font-black uppercase tracking-[0.4em] text-[9px]">Be Part of Something Eternal</span>
                            <h2 className="font-black tracking-tighter leading-none text-white" style={{ fontSize: "clamp(2.5rem,6vw,5rem)" }}>
                                JOIN THE<br /><span className="text-gold">MOVEMENT.</span>
                            </h2>
                            <p className="text-white/35 max-w-sm font-bold text-[10px] uppercase tracking-[0.18em] leading-relaxed">
                                Register for auditions across Choir, Band, Media, Ushering, Security, and Dance at any chapter near you.
                            </p>
                        </div>
                        <div className="flex flex-col w-full md:w-auto gap-3 shrink-0">
                            <Link href="/join" className="flex items-center justify-center gap-2.5 px-9 py-4 bg-gold text-brown rounded-xl font-black text-[10px] uppercase tracking-[0.18em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_24px_rgba(212,175,55,0.2)]">
                                <SvgIcon name="group_add" size={16} /> Join Now
                            </Link>
                            <Link href="/chapters" className="flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl border border-gold/18 text-gold font-black text-[10px] uppercase tracking-[0.18em] hover:bg-gold/8 active:scale-95 transition-all" style={{ background: "rgba(212,175,55,0.03)" }}>
                                <SvgIcon name="groups" size={16} /> Browse Chapters
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </>
    );
}

// ─── Page shell ────────────────────────────────────────────────────────────────
export default function EventsPage() {
    return (
        <main className="bg-background min-h-screen">
            <Suspense
                fallback={
                    <div className="flex items-center justify-center py-40">
                        <SvgIcon name="sync" size={36} className="text-gold/30 animate-spin" />
                    </div>
                }
            >
                <EventsInner />
            </Suspense>
        </main>
    );
}