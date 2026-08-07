"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import SvgIcon from "@/components/ui/SvgIcon";

// ─── Spring presets (Apple Design) ──────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;
const SPRING_IN = { type: "spring", stiffness: 260, damping: 32, mass: 1.0 } as const;

// ─── Data ─────────────────────────────────────────────────────────────────────
interface MediaItem {
    title: string;
    category: string;
    year: string;
    image: string;
    layout: "hero" | "square";   // explicit layout variants
    type: "photo" | "video" | "documentary";
    views?: string;
    chapter?: string;
}

const mediaItems: MediaItem[] = [
    {
        title: "The Altar of 15,000",
        category: "Main Event",
        year: "2024",
        image: "/archival-1.jpg",
        layout: "hero",
        type: "video",
        views: "25K",
        chapter: "Nairobi"
    },
    {
        title: "Night of Worship",
        category: "Coastal Revival",
        year: "2016",
        image: "/archival-2.jpg",
        layout: "square",
        type: "photo",
        views: "8K",
        chapter: "Mombasa"
    },
    {
        title: "A Decade of Grace",
        category: "Documentary",
        year: "2014",
        image: "/mission-1.jpg",
        layout: "square",
        type: "documentary",
        views: "50K",
        chapter: "Continental"
    },
    {
        title: "Coast Revival",
        category: "Historical",
        year: "2009",
        image: "/archival-2.jpg",
        layout: "hero",
        type: "photo",
        views: "5K",
        chapter: "Mombasa"
    }
];

// ─── Media Card Component ─────────────────────────────────────────────────────
function MediaCard({ item, index }: { item: MediaItem; index: number }) {
    const shouldReduceMotion = useReducedMotion();
    const [hovered, setHovered] = useState(false);

    const getTypeIcon = (type: string, isHero: boolean) => {
        const size = isHero ? 32 : 20;
        return (type === "video" || type === "documentary")
            ? <SvgIcon name="play_arrow" size={size} />
            : <SvgIcon name="visibility" size={size} />;
    };

    const isHero = item.layout === "hero";

    // Responsive grid spans and heights – no row numbers, purely column spans
    const gridClasses = isHero
        ? "col-span-1 sm:col-span-2 lg:col-span-4 h-64 sm:h-72 lg:h-[420px]"
        : "col-span-1 sm:col-span-1 lg:col-span-2 h-56 sm:h-64 lg:h-[260px]";

    const textSize = isHero
        ? "text-4xl md:text-5xl lg:text-6xl"
        : "text-2xl md:text-3xl";

    const watermarkSize = isHero ? "text-6xl" : "text-3xl";

    const delay = (i: number) => shouldReduceMotion ? { duration: 0.15 } : { ...SPRING_IN, delay: i * 0.05 };

    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={delay(index)}
            className={gridClasses}
        >
            <Link
                href="/media"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`group relative block w-full h-full rounded-[2rem] overflow-hidden border border-white/8 cursor-pointer transform-gpu`}
                style={{ WebkitTapHighlightColor: "transparent" }}
            >
                {/* Background Image & Zoom */}
                <motion.div
                    className="absolute inset-0 w-full h-full"
                    animate={{ scale: hovered ? 1.05 : 1, filter: hovered ? "grayscale(0%)" : "grayscale(100%)" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                >
                    <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        draggable={false}
                        unoptimized
                    />
                </motion.div>

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent transition-opacity duration-500 z-10" />
                <div className="absolute inset-0 bg-gold/10 opacity-0 group-hover:opacity-20 mix-blend-overlay transition-opacity duration-500 z-10" />

                {/* Watermark (Reveals on hover) */}
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, rotate: -15, scale: 0.9 }}
                            animate={{ opacity: 0.15, rotate: -20, scale: 1 }}
                            exit={{ opacity: 0, rotate: -15, scale: 0.9 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                        >
                            <span className={`text-white font-black tracking-[0.4em] uppercase select-none ${watermarkSize}`}>
                                AFLEWO
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content Container */}
                <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between z-20">

                    {/* Top Row: Badges */}
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-gold/15 text-gold border border-gold/20 shadow-[0_0_12px_rgba(212,175,55,0.15)]" style={{ backdropFilter: "blur(8px)" }}>
                                {item.category}
                            </span>
                            {item.chapter && (
                                <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-white/10 text-white/70 border border-white/10 hidden sm:flex items-center gap-1" style={{ backdropFilter: "blur(8px)" }}>
                                    <SvgIcon name="location" size={10} /> {item.chapter}
                                </span>
                            )}
                        </div>
                        {item.views && (
                            <span className="flex items-center gap-1 text-[10px] font-black tracking-widest text-white/50 bg-black/40 px-2 py-1 rounded-full border border-white/5" style={{ backdropFilter: "blur(8px)" }}>
                                <SvgIcon name="visibility" size={10} /> {item.views}
                            </span>
                        )}
                    </div>

                    {/* Bottom Row: Text & Action */}
                    <div className="flex items-end justify-between gap-4">
                        <motion.div
                            className="space-y-1"
                            animate={{ y: hovered ? 0 : 8 }}
                            transition={SPRING}
                        >
                            <span className="text-gold text-[10px] font-black uppercase tracking-[0.25em] block">{item.year}</span>
                            <h3 className={`font-black text-white leading-tight tracking-tight ${textSize}`}>
                                {item.title}
                            </h3>
                        </motion.div>

                        {/* Button with only scale animation – no magnetic movement */}
                        <motion.div
                            animate={{
                                scale: hovered ? 1 : 0.8,
                                opacity: hovered ? 1 : 0
                            }}
                            transition={SPRING}
                            className={`shrink-0 bg-gold text-brown rounded-full flex items-center justify-center shadow-glow ${isHero ? "p-4 md:p-5" : "p-3"}`}
                        >
                            {getTypeIcon(item.type, isHero)}
                        </motion.div>
                    </div>

                </div>

                {/* Hover border effect */}
                <motion.div
                    className="absolute inset-0 border-[3px] border-gold/0 rounded-[2rem] pointer-events-none z-30"
                    animate={{ borderColor: hovered ? "rgba(212,175,55,0.3)" : "rgba(212,175,55,0)" }}
                    transition={{ duration: 0.3 }}
                />
            </Link>
        </motion.div>
    );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function MediaPreview() {
    const shouldReduceMotion = useReducedMotion();

    const stagger = (i: number) => shouldReduceMotion ? { duration: 0.15 } : { ...SPRING_IN, delay: i * 0.05 };

    const stats = [
        { label: "Photos", value: "5,000+", icon: "camera" },
        { label: "Videos", value: "200+", icon: "play_circle" },
        { label: "Years Archived", value: "20", icon: "history" },
        { label: "Chapters", value: "11", icon: "location_on" }
    ];

    return (
        <section id="media" className="section-padding bg-background relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-1/4 right-[-10%] w-[500px] h-[500px] bg-gold/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-1/4 left-[-10%] w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

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
                            <SvgIcon name="photo_library" size={12} /> The Archive
                        </div>
                        <h2 className="text-[clamp(3rem,8vw,5.5rem)] font-black tracking-tighter leading-[0.85]">
                            THE SOUND <br />
                            <span className="text-gold">OF HEAVEN</span>
                        </h2>
                        <p className="text-white/40 max-w-md font-bold text-xs uppercase tracking-[0.2em] leading-relaxed pt-2">
                            20 years of worship captured. From the first gathering in 2004 to today's continental movement.
                        </p>
                    </div>

                    <motion.div
                        whileTap={{ scale: 0.96 }}
                        transition={SPRING}
                    >
                        <Link
                            href="/media"
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-gold/30 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-gold transition-all"
                            style={{ backdropFilter: "blur(12px)" }}
                        >
                            Explore Full Gallery
                            <SvgIcon name="arrow_forward" size={16} />
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Bento Grid Gallery – no auto-rows, explicit heights on cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                    {mediaItems.map((item, i) => (
                        <MediaCard key={i} item={item} index={i} />
                    ))}
                </div>

                {/* Stats Bar */}
                <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={stagger(3)}
                    className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -4, borderColor: "rgba(212,175,55,0.25)", background: "rgba(255,255,255,0.04)" }}
                            className="p-8 rounded-[2rem] border border-white/6 text-center transition-colors cursor-default"
                            style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)" }}
                        >
                            <SvgIcon name={stat.icon} size={28} className="mx-auto text-gold/80 mb-4" />
                            <div className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mb-1">{stat.value}</div>
                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">{stat.label}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}