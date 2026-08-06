"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import SvgIcon from "@/components/ui/SvgIcon";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";

// ─── Spring preset ─────────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 360, damping: 36, mass: 0.85 } as const;

interface Story {
    content: string;
    name: string;
    role: string;
    stat: string;
    year?: string;
    chapter?: string;
}

const stories: Story[] = [
    {
        content: "AFLEWO 2025 has been refreshing, empowering and full of God's presence. Thousands came despite the rain, unified in worship.",
        name: "Winners' Chapel Testimony",
        role: "Host Partner",
        stat: "10K+ Attended",
        year: "2025",
        chapter: "Nairobi",
    },
    {
        content: "Since 2004, the vision of corporate worship has birthed 11 chapters across Kenya, Tanzania, Rwanda and Uganda. The movement grows.",
        name: "Hubert de Rogue Maura",
        role: "Chairman",
        stat: "11 Chapters",
        year: "2004–2026",
        chapter: "Continental",
    },
    {
        content: "The JCC Bamburi Centre in Mombasa has transformed my spiritual life. Every night at 9 PM, we gather virtually and heaven touches earth.",
        name: "JCC Bamburi Centre",
        role: "Member Testimony",
        stat: "365 Nights/Year",
        year: "2025",
        chapter: "Mombasa",
    },
    {
        content: "Being part of the 1,000-voice choir was life-changing. The unity, the power, the presence - it's indescribable.",
        name: "Nakuru Choir Member",
        role: "Volunteer",
        stat: "1,000 Voices",
        year: "2024",
        chapter: "Nakuru",
    },
];

export default function StoriesTeaser() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const inView = useInView(sectionRef, { once: true, margin: "-12%" });
    const shouldReduceMotion = useReducedMotion();
    const [activeIndex, setActiveIndex] = useState(0);
    const [dir, setDir] = useState(1);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const goTo = useCallback((next: number, direction = 1) => {
        setDir(direction);
        setActiveIndex((next + stories.length) % stories.length);
    }, []);

    const handleNext = useCallback(() => goTo(activeIndex + 1, 1), [activeIndex, goTo]);
    const handlePrev = useCallback(() => goTo(activeIndex - 1, -1), [activeIndex, goTo]);

    // Auto-advance
    useEffect(() => {
        timerRef.current = setInterval(handleNext, 6000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [handleNext]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(handleNext, 6000);
    }, [handleNext]);

    const story = stories[activeIndex];

    const variants = {
        enter: (d: number) => ({
            opacity: 0,
            x: shouldReduceMotion ? 0 : d * 50,
            scale: shouldReduceMotion ? 1 : 0.97,
        }),
        center: { opacity: 1, x: 0, scale: 1 },
        exit: (d: number) => ({
            opacity: 0,
            x: shouldReduceMotion ? 0 : d * -50,
            scale: shouldReduceMotion ? 1 : 0.97,
        }),
    };

    return (
        <section ref={sectionRef} id="stories" className="py-24 md:py-32 px-6 relative overflow-hidden" style={{ background: "hsl(25 20% 6%)" }}>
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gold/5 blur-[160px] pointer-events-none rounded-bl-[50%]" />
            <div className="absolute bottom-0 left-0 w-[350px] h-[300px] bg-purple-500/4 blur-[130px] pointer-events-none" />

            <div className="max-container relative z-10">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start lg:items-center">

                    {/* ── Left: header + controls ── */}
                    <motion.div
                        initial={{ opacity: 0, x: -32 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ ...SPRING, delay: 0 }}
                        className="flex-1 space-y-8 lg:sticky lg:top-32"
                    >
                        {/* Label pill */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gold/8 border border-gold/18 rounded-full text-gold text-[8px] font-black uppercase tracking-[0.3em]">
                            <SvgIcon name="star" size={12} />
                            Testimonies
                        </div>

                        {/* Headline */}
                        <div className="space-y-2">
                            <h2
                                className="font-black tracking-tighter leading-[0.88] text-white"
                                style={{ fontSize: "clamp(3rem,7vw,6.5rem)" }}
                            >
                                HEIRS OF<br />
                                <span className="text-gold">GLORY</span>
                            </h2>
                            <p className="text-white/40 font-medium text-[13px] leading-relaxed max-w-xs italic">
                                "Behind every worship night is a story of transformation - from hidden prayers to continental echoes."
                            </p>
                        </div>

                        {/* Desktop nav + CTA */}
                        <div className="hidden lg:flex flex-col gap-6">
                            {/* Pagination dots + chevrons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { handlePrev(); resetTimer(); }}
                                    aria-label="Previous story"
                                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/8 text-white/40 hover:text-white hover:border-white/20 transition-all active:scale-90"
                                >
                                    <SvgIcon name="chevron_left" size={16} />
                                </button>
                                <div className="flex gap-1.5">
                                    {stories.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { goTo(i, i > activeIndex ? 1 : -1); resetTimer(); }}
                                            aria-label={`Story ${i + 1}`}
                                            className={`h-1.5 rounded-full transition-all duration-400 ${i === activeIndex ? "w-6 bg-gold" : "w-1.5 bg-white/18 hover:bg-white/35"}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => { handleNext(); resetTimer(); }}
                                    aria-label="Next story"
                                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/8 text-white/40 hover:text-white hover:border-white/20 transition-all active:scale-90"
                                >
                                    <SvgIcon name="chevron_right" size={16} />
                                </button>
                            </div>

                            <Link
                                href="/testify"
                                className="inline-flex items-center gap-2 bg-gold text-brown px-7 py-3.5 rounded-full font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-95 w-max"
                            >
                                Share Your Story
                                <SvgIcon name="arrow_forward" size={14} />
                            </Link>
                        </div>
                    </motion.div>

                    {/* ── Right: animated story card ── */}
                    <motion.div
                        initial={{ opacity: 0, x: 32 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ ...SPRING, delay: 0.1 }}
                        className="flex-1 w-full flex flex-col gap-8"
                    >
                        {/* Card carousel */}
                        <div className="relative overflow-hidden min-h-[320px] sm:min-h-[360px]">
                            <AnimatePresence mode="wait" custom={dir}>
                                <motion.div
                                    key={activeIndex}
                                    custom={dir}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ ...SPRING }}
                                    className="absolute inset-0"
                                >
                                    <div
                                        className="relative h-full rounded-[1.75rem] border border-white/6 p-8 md:p-10 flex flex-col overflow-hidden group"
                                        style={{ background: "rgba(255,255,255,0.025)", backdropFilter: "blur(24px) saturate(160%)" }}
                                    >
                                        {/* Ambient hover glow */}
                                        <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/3 transition-colors duration-500 pointer-events-none rounded-[1.75rem]" />

                                        {/* Decorative quote mark */}
                                        <span
                                            className="absolute top-6 right-8 font-black text-gold/8 leading-none pointer-events-none select-none"
                                            style={{ fontSize: "7rem" }}
                                            aria-hidden="true"
                                        >
                                            "
                                        </span>

                                        <div className="relative z-10 flex flex-col gap-6 h-full">
                                            {/* Chapter + year pills */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {story.chapter && (
                                                    <span className="px-2.5 py-1 rounded-full bg-gold/8 border border-gold/15 text-gold text-[8px] font-black uppercase tracking-[0.25em]">
                                                        {story.chapter}
                                                    </span>
                                                )}
                                                {story.year && (
                                                    <span className="text-white/25 text-[8px] font-black uppercase tracking-[0.25em]">
                                                        {story.year}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quote */}
                                            <p
                                                className="font-black tracking-tight text-white leading-snug flex-1"
                                                style={{ fontSize: "clamp(1.1rem,2.2vw,1.5rem)" }}
                                            >
                                                "{story.content}"
                                            </p>

                                            {/* Attribution + stat */}
                                            <div className="flex items-end justify-between gap-4 pt-5 border-t border-white/6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">{story.name}</p>
                                                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30 mt-0.5">{story.role}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/8 border border-gold/12 shrink-0">
                                                    <SvgIcon name="favorite" size={12} className="text-gold" />
                                                    <span className="text-[9px] font-black text-gold">{story.stat}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom accent line */}
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-[1.75rem]" />
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Mobile controls */}
                        <div className="flex lg:hidden flex-col gap-5 items-center sm:items-start">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { handlePrev(); resetTimer(); }}
                                    aria-label="Previous story"
                                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/8 text-white/40 hover:text-white hover:border-white/20 transition-all active:scale-90"
                                >
                                    <SvgIcon name="chevron_left" size={16} />
                                </button>
                                <div className="flex gap-1.5">
                                    {stories.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => { goTo(i, i > activeIndex ? 1 : -1); resetTimer(); }}
                                            aria-label={`Story ${i + 1}`}
                                            className={`h-1.5 rounded-full transition-all duration-400 ${i === activeIndex ? "w-6 bg-gold" : "w-1.5 bg-white/18 hover:bg-white/35"}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => { handleNext(); resetTimer(); }}
                                    aria-label="Next story"
                                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/8 text-white/40 hover:text-white hover:border-white/20 transition-all active:scale-90"
                                >
                                    <SvgIcon name="chevron_right" size={16} />
                                </button>
                            </div>
                            <Link
                                href="/testify"
                                className="inline-flex items-center gap-2 bg-gold text-brown px-7 py-3.5 rounded-full font-black uppercase tracking-widest text-[10px] hover:brightness-110 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-95"
                            >
                                Share Your Story
                                <SvgIcon name="arrow_forward" size={14} />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
