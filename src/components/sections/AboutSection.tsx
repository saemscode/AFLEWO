"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";

// ─── Spring preset - Apple critically-damped (no overshoot) ───────────────────
const SPRING = { type: "spring", stiffness: 340, damping: 34, mass: 0.9 } as const;

const timelineEvents = [
    {
        year: "2004",
        title: "The Birth",
        desc: "Inaugural event at CITAM Karen, birthed by the Sing Africa Alumni from Daystar University - a seed planted in continental worship.",
        image: "/archival-1.jpg",
    },
    {
        year: "2007",
        title: "Nyayo Stadium",
        desc: "A massive shift in scale, uniting tens of thousands in one of Kenya's most iconic national venues.",
        image: "/archival-2.jpg",
    },
    {
        year: "2013",
        title: "Winners' Chapel",
        desc: "Moving to the largest indoor facility in East Africa to hold over 15,000 worshippers under one roof.",
        image: "/mission-1.jpg",
    },
    {
        year: "2024",
        title: "Heirs of God's Glory",
        desc: "Celebrating 20 years of the continental altar - 8 chapters, 3 nations, one unbroken sound.",
        image: "/archival-1.jpg",
    },
];

// ─── TimelineItem ─────────────────────────────────────────────────────────────
function TimelineItem({ event, index }: { event: typeof timelineEvents[number]; index: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-15%" });
    const isLeft = index % 2 === 0;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ ...SPRING, delay: 0.05 }}
            className={`flex flex-col ${isLeft ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-10 md:gap-20`}
        >
            {/* ── Text block ── */}
            <div className="flex-1 text-center md:text-left space-y-4">
                {/* Year - large editorial watermark */}
                <span
                    className="block font-black tracking-tighter text-gold/60 leading-none select-none"
                    style={{ fontSize: "clamp(3rem,7vw,5rem)" }}
                    aria-hidden="true"
                >
                    {event.year}
                </span>
                <div className="-mt-6 space-y-2">
                    <h3
                        className="font-black tracking-tight text-white leading-none"
                        style={{ fontSize: "clamp(1.6rem,3.5vw,2.8rem)" }}
                    >
                        {event.title}
                    </h3>
                    <p className="text-white/45 font-medium text-[13px] leading-relaxed max-w-sm mx-auto md:mx-0">
                        {event.desc}
                    </p>
                </div>
            </div>

            {/* ── Image card ── */}
            <div className="flex-1 w-full">
                <div
                    className="relative w-full overflow-hidden rounded-[1.75rem] group"
                    style={{
                        aspectRatio: "4/3",
                        background: "rgba(255,255,255,0.018)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                    }}
                >
                    {/* Parallax inner */}
                    <div className="absolute -top-[15%] -bottom-[15%] left-0 right-0 transition-transform duration-700 group-hover:scale-105">
                        <Image
                            src={event.image}
                            alt={event.title}
                            fill
                            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                        />
                    </div>
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                </div>
            </div>
        </motion.div>
    );
}

// ─── AboutSection ─────────────────────────────────────────────────────────────
export default function AboutSection() {
    const headerRef = useRef<HTMLDivElement>(null);
    const headerInView = useInView(headerRef, { once: true, margin: "-10%" });

    return (
        <section className="py-28 md:py-36 px-6 bg-background relative overflow-hidden" id="about">
            {/* Decorative ghost text */}
            <div
                className="absolute -left-12 top-1/3 opacity-[0.018] pointer-events-none rotate-90 origin-left select-none"
                aria-hidden="true"
            >
                <span
                    className="font-black uppercase tracking-tighter text-white"
                    style={{ fontSize: "clamp(8rem,18vw,18rem)" }}
                >
                    Est. 2004
                </span>
            </div>

            <div className="max-container relative z-10">
                {/* Header */}
                <motion.div
                    ref={headerRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={headerInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ ...SPRING, delay: 0 }}
                    className="flex flex-col items-center text-center mb-24 md:mb-32"
                >
                    {/* Accent line */}
                    <div className="w-10 h-[3px] bg-gold mb-8 rounded-full" />
                    <h2
                        className="font-black tracking-tighter text-white leading-[0.88] mb-6"
                        style={{ fontSize: "clamp(2.8rem,7vw,6.5rem)" }}
                    >
                        THE JOURNEY<br />
                        OF <span className="text-gold">ALTARS.</span>
                    </h2>
                    <p className="text-white/45 max-w-xl font-medium text-[13px] md:text-[15px] leading-relaxed">
                        Since 2004, AFLEWO has been more than an event - it is a continental movement of unity, intercession, and the relentless pursuit of God's presence across Africa.
                    </p>
                </motion.div>

                {/* Timeline items */}
                <div className="relative">
                    {/* Vertical spine */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/15 to-transparent hidden md:block pointer-events-none" />

                    <div className="space-y-28 md:space-y-36">
                        {timelineEvents.map((event, i) => (
                            <TimelineItem key={event.year} event={event} index={i} />
                        ))}
                    </div>
                </div>

                {/* Bottom stat strip */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ ...SPRING, delay: 0.1 }}
                    className="mt-28 grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {[
                        { value: "20+", label: "Years" },
                        { value: "11", label: "Chapters" },
                        { value: "4", label: "Nations" },
                        { value: "15K+", label: "Voices" },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="p-6 rounded-[1.5rem] border border-white/5 text-center"
                            style={{ background: "rgba(255,255,255,0.018)", backdropFilter: "blur(16px)" }}
                        >
                            <p
                                className="font-black text-gold tracking-tighter leading-none"
                                style={{ fontSize: "clamp(2rem,4vw,3.5rem)" }}
                            >
                                {s.value}
                            </p>
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25 mt-2">{s.label}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
