"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import SvgIcon from "@/components/ui/SvgIcon";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { type Session } from "@supabase/supabase-js";
import { events, parseEventDate, type AFLEWOEvent } from "@/lib/events";

// ─── Apple Design spring presets ─────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;
const SPRING_IN = { type: "spring", stiffness: 260, damping: 32, mass: 1.0 } as const;

// ─── Data ─────────────────────────────────────────────────────────────────────
const chapterColors: Record<string, string> = {
    Nairobi: "text-gold border-gold/30 bg-gold/10",
    Nakuru: "text-gold border-gold/30 bg-gold/10",
    Eldoret: "text-gold border-gold/30 bg-gold/10",
    Mombasa: "text-gold border-gold/30 bg-gold/10",
    Tanzania: "text-gold border-gold/30 bg-gold/10",
    Rwanda: "text-gold border-gold/30 bg-gold/10",
    Nyeri: "text-gold border-gold/30 bg-gold/10",
    Meru: "text-gold border-gold/30 bg-gold/10",
};

// Chapter colour tokens for avatar clusters on calendar cells
const CHAPTER_AVATAR_COLOUR: Record<string, string> = {
    Nairobi: "#D4AF37", Mombasa: "#22d3ee", Nakuru: "#f97316",
    Eldoret: "#a855f7", Nyeri: "#22c55e", Meru: "#84cc16",
    Tanzania: "#10b981", Rwanda: "#3b82f6", Kampala: "#eab308",
    Machakos: "#f43f5e", Kisumu: "#60a5fa",
};

const CHAPTER_FLAGS: Record<string, string> = {
    Nairobi: "🇰🇪", Mombasa: "🇰🇪", Nakuru: "🇰🇪", Eldoret: "🇰🇪",
    Nyeri: "🇰🇪", Meru: "🇰🇪", Machakos: "🇰🇪", Kisumu: "🇰🇪",
    Tanzania: "🇹🇿", Rwanda: "🇷🇼", Kampala: "🇺🇬",
};

const CHAPTERS = Object.keys(chapterColors);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

import FlipClockCountdown from "@/components/ui/FlipClock";

// ─── Attendee Avatar Cluster - shown on calendar day cells with events ─────────
function DayAvatarCluster({ dayEvents, isSelected }: { dayEvents: AFLEWOEvent[]; isSelected: boolean }) {
    const visible = dayEvents.slice(0, 3);
    const overflow = dayEvents.length - 3;
    if (isSelected) {
        // On selected (gold) day, show a simple white dot instead to preserve contrast
        return (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brown/80" />
        );
    }
    return (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center">
            <div className="flex -space-x-0.5">
                {visible.map((ev, idx) => (
                    <div
                        key={ev.id}
                        title={`${ev.chapter} - ${ev.title}`}
                        className="w-[9px] h-[9px] rounded-full border border-black/50 shrink-0"
                        style={{
                            background: CHAPTER_AVATAR_COLOUR[ev.chapter] ?? "#D4AF37",
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

// ─── Countdown Panel ──────────────────────────────────────────────────────────
function CountdownPanel({ nextEvent, timeLeft }: { nextEvent: AFLEWOEvent | null; timeLeft: { days: number; hours: number; mins: number; secs: number } }) {
    return (
        <div
            className="rounded-[2rem] border border-gold/15 p-8 md:p-10 space-y-8 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,rgba(212,175,55,0.08) 0%,rgba(0,0,0,0) 100%)", backdropFilter: "blur(20px)" }}
        >
            {/* Radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent pointer-events-none" />

            <div className="relative z-10 text-center space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/70">Next Event Countdown</span>
                <h3 className="text-2xl md:text-3xl font-black tracking-tighter text-white leading-none">
                    {nextEvent?.title || "THE NEXT EVENT"}
                </h3>
                {nextEvent && (
                    <p className="text-white/35 text-[11px] font-bold uppercase tracking-[0.2em]">
                        {nextEvent.chapter} · {nextEvent.date}
                    </p>
                )}
            </div>

            <div className="relative z-10 flex justify-center mb-8">
                {nextEvent ? (
                    <FlipClockCountdown targetDate={parseEventDate(nextEvent.date) || new Date()} size="compact" />
                ) : (
                    <div className="text-white/30 text-xs font-black uppercase tracking-widest py-8">No Upcoming Events</div>
                )}
            </div>

            <motion.div whileTap={{ scale: 0.97 }} transition={SPRING} className="relative z-10">
                <Link
                    href={nextEvent?.url || "/join"}
                    className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-gold text-brown font-black text-[11px] uppercase tracking-[0.25em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_24px_rgba(212,175,55,0.2)] relative overflow-hidden"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                >
                    {/* Shimmer sweep */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
                    <SvgIcon name="check_circle" size={16} />
                    Register Now
                </Link>
            </motion.div>
        </div>
    );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function EventHub() {
    const shouldReduceMotion = useReducedMotion();
    const [currentMonth, setCurrentMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
    const [session, setSession] = useState<Session | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: auth } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
        return () => auth.subscription.unsubscribe();
    }, []);

    const nextEvent = useMemo(() => {
        if (!mounted) return null;
        const now = new Date();
        return events
            .filter(e => (e.visibility !== "member" || session))
            .filter(e => { const d = parseEventDate(e.date); return d && d > now; })
            .sort((a, b) => { const da = parseEventDate(a.date); const db = parseEventDate(b.date); if (!da || !db) return 0; return da.getTime() - db.getTime(); })[0] || null;
    }, [session, mounted]);

    useEffect(() => {
        if (!nextEvent) return;
        const tick = () => {
            const d = parseEventDate(nextEvent.date);
            if (!d) return;
            const diff = Math.max(0, d.getTime() - Date.now());
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                mins: Math.floor((diff % 3600000) / 60000),
                secs: Math.floor((diff % 60000) / 1000),
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [nextEvent]);

    const getDaysInMonth = useCallback((d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), []);
    const getFirstDay = useCallback((d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay(), []);

    // Returns all visible events for a given calendar date
    const getEventsForDate = useCallback((d: Date) => events.filter(e => {
        if (e.visibility === "member" && !session) return false;
        const ed = parseEventDate(e.date);
        return ed && ed.toDateString() === d.toDateString();
    }), [session]);

    const filteredEvents = useMemo(() => {
        if (!mounted) return [];
        let list = events.filter(e => e.visibility !== "member" || session);
        if (activeFilters.length) list = list.filter(e => activeFilters.includes(e.chapter));
        if (selectedDate) list = list.filter(e => { const d = parseEventDate(e.date); return d && d.toDateString() === selectedDate.toDateString(); });
        return list;
    }, [activeFilters, selectedDate, session, mounted]);

    const toggleFilter = (c: string) => setActiveFilters(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
    const navigateMonth = (dir: number) => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));

    const downloadICS = () => {
        const vis = events.filter(e => e.visibility !== "member" || session);
        const content = `BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:AFLEWO 2026\n${vis.map(e => `BEGIN:VEVENT\nSUMMARY:${e.title}\nDTSTART:${e.start}\nDTEND:${e.end}\nLOCATION:${e.location}\nEND:VEVENT`).join('\n')}\nEND:VCALENDAR`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
        a.download = "AFLEWO_2026.ics";
        a.click();
    };

    const stagger = (i: number) => shouldReduceMotion ? { duration: 0.15 } : { ...SPRING_IN, delay: i * 0.07 };

    return (
        <section id="events" className="section-padding bg-background relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-gold/4 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />

            <div className="max-container relative z-10">
                {/* Header */}
                <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={stagger(0)}
                    className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16"
                >
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold/20 bg-gold/8 text-gold text-[10px] font-black uppercase tracking-[0.25em]">
                            <SvgIcon name="calendar" size={12} /> Events &amp; Calendar
                        </div>
                        <h2 className="text-[clamp(3rem,8vw,5.5rem)] font-black tracking-tighter leading-[0.85]">
                            THE <span className="text-gold">CALENDAR</span>
                        </h2>
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING}
                        onClick={downloadICS}
                        className="flex items-center gap-3 px-8 py-4 bg-gold text-brown rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                        style={{ WebkitTapHighlightColor: "transparent" }}
                    >
                        <SvgIcon name="download" size={16} /> Download 2026 Calendar (.ics)
                    </motion.button>
                </motion.div>

                {/* Grid: Calendar | Events+Countdown */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ── Calendar + Filters ─── */}
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={stagger(1)}
                        className="lg:col-span-5 space-y-5"
                    >
                        {/* Calendar Widget */}
                        <div
                            className="rounded-[2rem] border border-white/8 p-7"
                            style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(180%)" }}
                        >
                            {/* Month nav */}
                            <div className="flex items-center justify-between mb-7">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    transition={SPRING}
                                    onClick={() => navigateMonth(-1)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/8 hover:border-gold/30 hover:bg-gold/10 transition-colors"
                                >
                                    <SvgIcon name="arrow_left" size={18} />
                                </motion.button>
                                <h3 className="text-base font-black tracking-tight">
                                    {MONTHS[currentMonth.getMonth()]} <span className="text-gold">{currentMonth.getFullYear()}</span>
                                </h3>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    transition={SPRING}
                                    onClick={() => navigateMonth(1)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/8 hover:border-gold/30 hover:bg-gold/10 transition-colors"
                                >
                                    <SvgIcon name="arrow_right" size={18} />
                                </motion.button>
                            </div>

                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 mb-3">
                                {WEEKDAYS.map((d, i) => (
                                    <div key={`wd-${i}`} className="text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/25 py-2">{d}</div>
                                ))}
                            </div>

                            {/* Days grid - upgraded with avatar clusters and today dot */}
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: getFirstDay(currentMonth) }).map((_, i) => (
                                    <div key={`e-${i}`} className="aspect-square" />
                                ))}
                                {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                                    const dayEvents = getEventsForDate(date);
                                    const hasEvents = dayEvents.length > 0;
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    return (
                                        <motion.button
                                            key={i}
                                            whileTap={{ scale: 0.86 }}
                                            transition={SPRING}
                                            onClick={() => setSelectedDate(isSelected ? null : date)}
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

                                            {/* Today dot: hollow ring if no events, filled gold if events */}
                                            {isToday && !isSelected && (
                                                <span
                                                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full ${hasEvents ? "bg-gold" : "bg-transparent border border-gold"
                                                        }`}
                                                />
                                            )}

                                            {/* Non‑today with events: chapter avatar cluster */}
                                            {hasEvents && !isSelected && !isToday && (
                                                <DayAvatarCluster dayEvents={dayEvents} isSelected={isSelected} />
                                            )}

                                            {/* Selected day with events: small brown dot for contrast on gold */}
                                            {hasEvents && isSelected && (
                                                <span className="w-1 h-1 rounded-full bg-brown/70" />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <AnimatePresence>
                                {selectedDate && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        transition={SPRING}
                                        onClick={() => setSelectedDate(null)}
                                        className="mt-5 w-full py-3 rounded-xl border border-white/8 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white hover:border-white/20 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <SvgIcon name="close" size={14} /> Clear Selection
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Calendar Legend */}
                        <div
                            className="rounded-2xl border border-white/6 px-5 py-4"
                            style={{ background: "rgba(255,255,255,0.014)", backdropFilter: "blur(16px)" }}
                        >
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mb-3">Legend - Chapter Colours</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(CHAPTER_AVATAR_COLOUR).slice(0, 8).map(([chapter, colour]) => (
                                    <div key={chapter} className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colour }} />
                                        <span className="text-[8px] font-bold text-white/35">{chapter}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chapter filters */}
                        <div
                            className="rounded-[2rem] border border-white/8 p-6 space-y-4"
                            style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)" }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">Filter by Chapter</span>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    transition={SPRING}
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showFilters ? "bg-gold text-brown" : "border border-white/10 hover:border-gold/30 hover:bg-gold/10"}`}
                                >
                                    <SvgIcon name="filter" size={14} />
                                </motion.button>
                            </div>
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={SPRING}
                                        className="flex flex-wrap gap-2 overflow-hidden"
                                    >
                                        {CHAPTERS.map(c => (
                                            <motion.button
                                                key={c}
                                                whileTap={{ scale: 0.93 }}
                                                transition={SPRING}
                                                onClick={() => toggleFilter(c)}
                                                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-1.5 ${activeFilters.includes(c)
                                                    ? `${chapterColors[c]} shadow-sm`
                                                    : "border-white/8 text-white/40 hover:border-white/20 hover:text-white/70"
                                                    }`}
                                            >
                                                {activeFilters.includes(c) && <SvgIcon name="check" size={10} />}
                                                {/* Chapter avatar colour dot */}
                                                <span className="w-2 h-2 rounded-full" style={{ background: CHAPTER_AVATAR_COLOUR[c] ?? "#D4AF37" }} />
                                                {c}
                                            </motion.button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* ── Events list + Countdown ─── */}
                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={stagger(2)}
                        className="lg:col-span-7 space-y-5"
                    >
                        {/* Events List */}
                        <div
                            className="rounded-[2rem] border border-white/8 p-7"
                            style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px)" }}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-base font-black tracking-tight">
                                    {selectedDate
                                        ? `Events on ${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                        : "Upcoming Events"}
                                </h3>
                                <span className="px-3 py-1 rounded-full border border-white/8 text-[9px] font-black text-white/40">
                                    {filteredEvents.length} Events
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[440px] overflow-y-auto hide-scrollbar pr-1">
                                <AnimatePresence mode="popLayout">
                                    {filteredEvents.length === 0 ? (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center py-16 text-white/20 text-xs font-black uppercase tracking-widest"
                                        >
                                            No events for this selection
                                        </motion.div>
                                    ) : filteredEvents.map((e, i) => {
                                        const chapterColour = CHAPTER_AVATAR_COLOUR[e.chapter] ?? "#D4AF37";
                                        return (
                                            <motion.div
                                                key={e.id}
                                                layout
                                                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ ...SPRING_IN, delay: i * 0.04 }}
                                                className="group flex items-center justify-between gap-4 p-5 rounded-2xl border border-white/5 hover:border-gold/20 transition-all"
                                                style={{ background: "rgba(255,255,255,0.02)" }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Date badge with chapter colour */}
                                                    <div
                                                        className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border"
                                                        style={{ background: `${chapterColour}18`, borderColor: `${chapterColour}30` }}
                                                    >
                                                        <span className="text-lg font-black leading-none" style={{ color: chapterColour }}>
                                                            {e.date === "Every Night" ? "∞" : e.date.split(" ")[1]?.replace(",", "") ?? "?"}
                                                        </span>
                                                        <span className="text-[8px] font-black uppercase tracking-wide" style={{ color: `${chapterColour}90` }}>
                                                            {e.date === "Every Night" ? "DAILY" : e.date.split(" ")[0]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        {/* Chapter flag + name */}
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-[8px]">{CHAPTER_FLAGS[e.chapter] ?? "🌍"}</span>
                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: `${chapterColour}80` }}>{e.chapter}</span>
                                                        </div>
                                                        <h4 className="font-black text-white group-hover:text-gold transition-colors text-sm leading-tight">{e.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                                                            <SvgIcon name="schedule" size={10} />
                                                            <span>{e.time}</span>
                                                            <span className={`px-2 py-0.5 rounded-full border ${chapterColors[e.chapter] || "text-white/40 border-white/10 bg-white/5"}`}>
                                                                {e.chapter}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`https://maps.google.com/?q=${encodeURIComponent(e.location)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 rounded-xl bg-gold/10 hover:bg-gold border border-gold/20 hover:border-gold text-gold hover:text-brown transition-all shrink-0 active:scale-90"
                                                    style={{ WebkitTapHighlightColor: "transparent" }}
                                                >
                                                    <SvgIcon name="location_on" size={20} />
                                                </a>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            <div className="mt-5 pt-4 border-t border-white/5">
                                <Link
                                    href="/events"
                                    className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-gold transition-colors group"
                                >
                                    View Full Calendar
                                    <SvgIcon name="arrow_forward" size={12} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Countdown Panel */}
                        <CountdownPanel nextEvent={nextEvent} timeLeft={timeLeft} />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}