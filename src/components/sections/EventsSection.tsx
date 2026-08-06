"use client";

import { events, parseEventDate, type AFLEWOEvent } from "@/lib/events";
import { useMemo } from "react";
import Link from "next/link";
import SvgIcon from "@/components/ui/SvgIcon";

// ─── Colour tokens — match EventHub + events/page ────────────────────────────
const CHAPTER_COLOUR: Record<string, string> = {
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

function getTypeLabel(type: string) {
    return type;
}

interface EventsListProps {
    /** Max number of cards to show. Defaults to 3. */
    limit?: number;
    /** Filter by event type label. "All" = no filter. */
    typeFilter?: string;
    /** Filter by chapter name. "All Chapters" = no filter. */
    chapterFilter?: string;
    /** If true, also include past events (newest first). Defaults to false. */
    includePast?: boolean;
    /** Section heading. Defaults to "Upcoming Gatherings". */
    heading?: string;
    /** Sub-heading copy. Defaults to a standard line. */
    subheading?: string;
}

/**
 * EventsSection — reusable real-data card list component.
 *
 * Pulls events directly from @/lib/events (no fabricated data).
 * All visual tokens align with EventHub and events/page.
 * Props allow any page to embed a filtered, limited slice of upcoming events.
 */
export default function EventsSection({
    limit = 3,
    typeFilter = "All",
    chapterFilter = "All Chapters",
    includePast = false,
    heading = "Upcoming Gatherings",
    subheading = "One Africa, one voice. Join us at the physical venues and experience the collective ignite.",
}: EventsListProps) {
    const displayEvents = useMemo(() => {
        const now = new Date();
        let list = events.filter(e => {
            // Only show public events in this embeddable component
            if (e.visibility === "member") return false;
            if (typeFilter !== "All" && e.type !== typeFilter) return false;
            if (chapterFilter !== "All Chapters" && e.chapter !== chapterFilter) return false;
            return true;
        });

        const upcoming = list.filter(e => {
            const d = parseEventDate(e.date);
            return !d || d >= now || e.date === "Every Night";
        }).sort((a, b) => {
            const da = parseEventDate(a.date);
            const db = parseEventDate(b.date);
            if (!da) return 1;
            if (!db) return -1;
            return da.getTime() - db.getTime();
        });

        const past = includePast
            ? list.filter(e => {
                const d = parseEventDate(e.date);
                return d && d < now;
            }).sort((a, b) => {
                const da = parseEventDate(a.date);
                const db = parseEventDate(b.date);
                if (!da || !db) return 0;
                return db.getTime() - da.getTime(); // newest first
            })
            : [];

        return [...upcoming, ...past].slice(0, limit);
    }, [limit, typeFilter, chapterFilter, includePast]);

    return (
        <section className="py-20 px-6 bg-background" id="events-section">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-14">
                    <h2 className="text-[clamp(2.5rem,7vw,5rem)] font-black text-white uppercase tracking-tighter leading-[0.85] mb-4">
                        {heading.split(" ").map((word, i) =>
                            i === heading.split(" ").length - 1
                                ? <span key={i} className="text-gold"> {word}</span>
                                : <span key={i}>{word} </span>
                        )}
                    </h2>
                    <p className="text-white/40 text-[11px] max-w-2xl font-bold uppercase tracking-[0.2em] leading-relaxed">{subheading}</p>
                </div>

                {displayEvents.length === 0 ? (
                    <div className="text-center py-20 text-white/20 font-black uppercase tracking-[0.2em] text-[10px]">
                        No events to display
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayEvents.map((event) => {
                            const colour = CHAPTER_COLOUR[event.chapter] ?? "#D4AF37";
                            const flag = CHAPTER_FLAGS[event.chapter] ?? "🌍";
                            const eventDate = parseEventDate(event.date);
                            const isPast = eventDate && eventDate < new Date();

                            return (
                                <div
                                    key={event.id}
                                    className={`group relative rounded-[1.75rem] border overflow-hidden flex flex-col transition-all duration-300 ${
                                        isPast ? "border-white/4 opacity-50" : "border-white/6 hover:border-white/12 hover:-translate-y-1"
                                    }`}
                                    style={{ background: "rgba(255,255,255,0.018)", backdropFilter: "blur(20px) saturate(160%)" }}
                                >
                                    {/* Colour accent top stripe */}
                                    <div className="h-[3px] w-full" style={{ background: `linear-gradient(to right, ${colour}80, transparent)` }} />

                                    {/* Hover ambient */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(ellipse at top, ${colour}08, transparent 70%)` }} />

                                    {/* Date badge + category */}
                                    <div
                                        className="relative aspect-[4/3] flex flex-col items-center justify-center"
                                        style={{ background: `linear-gradient(135deg, ${colour}18 0%, #0A0706 100%)` }}
                                    >
                                        {/* Type badge */}
                                        <div className="absolute top-4 left-4">
                                            <span
                                                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border"
                                                style={{ color: colour, borderColor: `${colour}40`, background: `${colour}15` }}
                                            >
                                                {getTypeLabel(event.type)}
                                            </span>
                                        </div>

                                        {/* Past indicator */}
                                        {isPast && (
                                            <div className="absolute top-4 right-4">
                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-white/8 bg-white/4 text-white/30">Past</span>
                                            </div>
                                        )}

                                        {/* Live badge */}
                                        {event.isLive && (
                                            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/80 backdrop-blur-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white">Live</span>
                                            </div>
                                        )}

                                        {/* Big date number */}
                                        <div className="text-center">
                                            <p className="text-[4rem] font-black leading-none" style={{ color: colour }}>
                                                {event.date === "Every Night" ? "∞" : event.date === "TBD" ? "?" : event.date.split(" ")[1]?.replace(",", "") ?? "—"}
                                            </p>
                                            <p className="text-[12px] font-black uppercase tracking-[0.3em]" style={{ color: `${colour}80` }}>
                                                {event.date === "Every Night" ? "Nightly" : event.date === "TBD" ? "TBD" : event.date.split(" ")[0]}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-7 flex-1 flex flex-col justify-between relative z-10">
                                        <div>
                                            {/* Chapter */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[13px]">{flag}</span>
                                                <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: `${colour}90` }}>{event.chapter}</span>
                                            </div>
                                            <h3 className="text-[18px] font-black text-white mb-5 group-hover:text-gold transition-colors leading-snug">
                                                {event.title}
                                            </h3>
                                            <div className="space-y-2.5">
                                                <div className="flex items-center gap-2.5 text-white/40">
                                                    <SvgIcon name="schedule" size={14} className="shrink-0" style={{ color: `${colour}60` } as React.CSSProperties} />
                                                    <span className="text-[11px] font-medium">{event.date === "Every Night" ? "Nightly, 9:00 PM EAT" : `${event.date}${event.time !== "TBD" ? ` · ${event.time}` : ""}`}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-white/40">
                                                    <SvgIcon name="location_on" size={14} className="shrink-0" style={{ color: `${colour}60` } as React.CSSProperties} />
                                                    <span className="text-[11px] font-medium">{event.location}</span>
                                                </div>
                                                {event.description && (
                                                    <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2 mt-1">{event.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* CTA row */}
                                        <div className="mt-6 flex items-center justify-between">
                                            <Link
                                                href="/events"
                                                className="flex items-center gap-2 font-black uppercase tracking-[0.18em] text-[10px] transition-colors group/btn"
                                                style={{ color: colour }}
                                            >
                                                View Details
                                                <SvgIcon name="arrow_forward" size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                            {event.lat && event.lng && (
                                                <a
                                                    href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-xl border transition-all"
                                                    style={{ borderColor: `${colour}30`, background: `${colour}10`, color: colour }}
                                                    title="Open in Google Maps"
                                                >
                                                    <SvgIcon name="location" size={13} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* View all link */}
                <div className="mt-12 text-center">
                    <Link
                        href="/events"
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl border border-gold/20 text-gold font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gold/8 hover:border-gold/40 transition-all"
                        style={{ background: "rgba(212,175,55,0.04)" }}
                    >
                        <SvgIcon name="calendar" size={15} />
                        View Full Events Calendar
                        <SvgIcon name="arrow_forward" size={13} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
