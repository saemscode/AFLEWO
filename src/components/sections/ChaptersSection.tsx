"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SvgIcon from "@/components/ui/SvgIcon";
import Link from "next/link";
import Image from "next/image";
import { useChaptersWithLiveData, type Chapter } from "@/lib/use-chapters";
import { useQrModalState } from "@/hooks/use-qr-modal-state";
import FlipClockCountdown from "@/components/ui/FlipClock";

gsap.registerPlugin(ScrollTrigger);




interface ChapterModalProps {
    chapter: Chapter | null;
    isOpen: boolean;
    onClose: () => void;
}

function ChapterModal({ chapter, isOpen, onClose }: ChapterModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && modalRef.current && contentRef.current) {
            gsap.fromTo(modalRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
            gsap.fromTo(contentRef.current,
                { scale: 0.9, y: 40, opacity: 0 },
                { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: "expo.out", delay: 0.1 }
            );
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !chapter) return null;

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
        >
            <div
                ref={contentRef}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card-elevated rounded-[2rem] border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-10 p-3 rounded-full glass-card hover:bg-white/10 transition-colors"
                >
                    <SvgIcon name="close" size={20} />
                </button>

                {chapter.venueImage && (
                    <div className="relative h-64 w-full overflow-hidden rounded-t-[2rem]">
                        <Image
                            src={chapter.venueImage}
                            alt={chapter.venue}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    </div>
                )}

                <div className="p-8 md:p-12 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r ${chapter.color} text-white`}>
                                {chapter.status}
                            </span>
                            {chapter.hasPrayerCircle && (
                                <span className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                                    </span>
                                    Live Nightly
                                </span>
                            )}
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter">
                            AFLEWO <span className="text-gold">{chapter.name}</span>
                        </h2>
                        <p className="text-foreground/60 leading-relaxed max-w-2xl">
                            {chapter.description}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-card p-6 rounded-2xl space-y-2">
                            <SvgIcon name="calendar" className="text-gold" size={20} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Established</p>
                            <p className="text-2xl font-black">{chapter.established}</p>
                        </div>
                        <div className="glass-card p-6 rounded-2xl space-y-2">
                            <SvgIcon name="church" className="text-gold" size={20} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Primary Venue</p>
                            <p className="text-sm font-bold">{chapter.venue}</p>
                        </div>
                        {chapter.capacity && (
                            <div className="glass-card p-6 rounded-2xl space-y-2">
                                <SvgIcon name="people" className="text-gold" size={20} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Capacity</p>
                                <p className="text-2xl font-black">{chapter.capacity}</p>
                            </div>
                        )}
                    </div>

                    {chapter.upcomingEvent && (
                        <div className="glass-card p-6 rounded-2xl border-gold/20 bg-gold/5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gold">Next Event</p>
                                    <p className="text-lg font-bold">{chapter.upcomingEvent}</p>
                                </div>
                                {chapter.registrationOpen && (
                                    <Link
                                        href={chapter.link || `/chapters/${chapter.slug}`}
                                        target={chapter.link ? "_blank" : undefined}
                                        className="group px-6 py-3 rounded-full bg-gold text-brown text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
                                    >
                                        Register
                                        <div className="relative w-4 h-4 flex items-center justify-center -translate-x-1 group-hover:translate-x-0 transition-transform duration-300">
                                            <SvgIcon name="chevron_idle" size={14} className="absolute rotate-180 opacity-100 group-hover:opacity-0 transition-opacity duration-300" />
                                            <SvgIcon name="chevron_hover" size={14} className="absolute rotate-180 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                        <Link
                            href={`/chapters/${chapter.slug}`}
                            onClick={onClose}
                            className="group flex-1 min-w-[200px] inline-flex items-center justify-center gap-3 px-8 py-4 bg-gold text-brown hover:brightness-110 transition-all rounded-full font-black text-[10px] uppercase tracking-widest"
                        >
                            Open Full Page
                            <div className="relative w-4 h-4 flex items-center justify-center -translate-x-1 group-hover:translate-x-0 transition-transform duration-300">
                                <SvgIcon name="chevron_idle" size={16} className="absolute rotate-180 opacity-100 group-hover:opacity-0 transition-opacity duration-300" />
                                <SvgIcon name="chevron_hover" size={16} className="absolute rotate-180 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        </Link>
                        {chapter.contactPhone && (
                            <Link
                                href={`tel:${chapter.contactPhone}`}
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 glass-card hover:bg-white/10 transition-all rounded-full font-black text-[10px] uppercase tracking-widest"
                            >
                                <SvgIcon name="phone" size={16} /> Call
                            </Link>
                        )}
                        {chapter.contactEmail && (
                            <Link
                                href={`mailto:${chapter.contactEmail}`}
                                className="inline-flex items-center justify-center gap-3 px-8 py-4 glass-card hover:bg-white/10 transition-all rounded-full font-black text-[10px] uppercase tracking-widest"
                            >
                                <SvgIcon name="mail" size={16} /> Email
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface QrModalProps {
    chapter: Chapter | null;
    isOpen: boolean;
    onClose: () => void;
}

// ── QR Modal: four server-driven states ─────────────────────────────────────
// State is NEVER computed client-side from cached tier info.
// The server resolves it fresh on every modal open (tier and visibility_state
// can both change between page load and modal open).

function QrModal({ chapter, isOpen, onClose }: QrModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Resource ID for a chapter registration = the chapter's own DB id.
    // Falls back to the chapter's slug if no DB id is available.
    const resourceId = chapter?.id || null;
    const { state, fetchState, reset } = useQrModalState(
        resourceId,
        "chapter_registration"
    );

    // Fetch state from server whenever the modal opens (or resourceId changes)
    useEffect(() => {
        if (isOpen && resourceId) {
            fetchState();
        }
        if (!isOpen) {
            reset();
        }
    }, [isOpen, resourceId, fetchState, reset]);

    // Entrance animation
    useEffect(() => {
        if (isOpen && modalRef.current && contentRef.current) {
            gsap.fromTo(
                modalRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
            gsap.fromTo(
                contentRef.current,
                { scale: 0.88, y: 32, opacity: 0 },
                { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: "expo.out", delay: 0.05 }
            );
        }
    }, [isOpen]);

    // Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !chapter) return null;

    // ── External mode: chapter still using Google Form link ─────────────────
    // qr_mode = 'external' (default for all chapters) keeps the original
    // redirect behavior — no token generated, no tier check needed.
    if (chapter.qrMode === "external" || !chapter.id) {
        const registrationLink =
            chapter.link ||
            "https://docs.google.com/forms/d/e/1FAIpQLSevWug3ISRoyVTi4edAgdehWJZCR4wZ1FkhfFmtYsXUazQLyQ/viewform";

        return (
            <div
                ref={modalRef}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
                onClick={onClose}
            >
                <div
                    ref={contentRef}
                    className="relative glass-card-elevated p-8 rounded-[2rem] border-white/10 text-center max-w-sm w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                    >
                        <SvgIcon name="close" size={16} />
                    </button>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter">
                                Register for <span className="text-gold">{chapter.name}</span>
                            </h3>
                            <p className="text-foreground/50 text-sm">Scan or tap to register for the 2026 season</p>
                        </div>
                        {/* Static QR placeholder — links to registration form */}
                        <div className="relative mx-auto w-48 h-48 bg-white rounded-2xl p-3 flex items-center justify-center shadow-xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl pointer-events-none" />
                            {/* 5×5 deterministic dot grid for visual identity */}
                            <div className="relative grid grid-cols-5 gap-1">
                                {Array.from({ length: 25 }).map((_, i) => {
                                    const seed = chapter.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                                    const filled = ((seed * (i + 1) * 37) % 97) > 45;
                                    return (
                                        <div
                                            key={i}
                                            className={`w-6 h-6 rounded-sm ${filled ? "bg-[#201C18]" : "bg-transparent"}`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                                    <SvgIcon name="music" className="text-gold" size={20} />
                                </div>
                            </div>
                        </div>
                        <Link
                            href={registrationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-4 rounded-full bg-gold text-brown font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                            Open Registration Form
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Internal mode: server-resolved token system ──────────────────────────
    return (
        <div
            ref={modalRef}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
        >
            <div
                ref={contentRef}
                className="relative glass-card-elevated rounded-[2rem] border-white/10 text-center max-w-sm w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                >
                    <SvgIcon name="close" size={16} />
                </button>

                {/* ── Loading state ── */}
                {(state.status === "idle" || state.status === "loading") && (
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <div className="h-7 bg-white/5 rounded-xl animate-pulse mx-auto w-48" />
                            <div className="h-4 bg-white/5 rounded-lg animate-pulse mx-auto w-36" />
                        </div>
                        <div className="mx-auto w-48 h-48 bg-white/5 rounded-2xl animate-pulse" />
                        <div className="h-12 bg-white/5 rounded-full animate-pulse" />
                    </div>
                )}

                {/* ── Access Granted: real QR + action ── */}
                {state.status === "access_granted" && (
                    <div className="p-8 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black tracking-tighter">
                                Register for <span className="text-gold">{chapter.name}</span>
                            </h3>
                            <p className="text-foreground/40 text-xs uppercase tracking-widest font-bold">
                                2026 Season
                            </p>
                        </div>

                        {/* Real server-generated QR code */}
                        <div className="relative mx-auto w-52 h-52 bg-white rounded-2xl p-3 shadow-xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl pointer-events-none" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={state.data.qrDataUrl}
                                alt={`QR code for ${chapter.name} registration`}
                                className="w-full h-full object-contain rounded-xl"
                            />
                        </div>

                        {/* Expires label */}
                        <p className="text-foreground/30 text-[10px] font-bold uppercase tracking-widest">
                            Valid until{" "}
                            {new Date(state.data.expiresAt).toLocaleString("en-KE", {
                                timeZone: "Africa/Nairobi",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>

                        <div className="space-y-3">
                            <Link
                                href={state.data.actionHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-4 rounded-full bg-gold text-brown font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                            >
                                {state.data.actionLabel}
                            </Link>
                            {/* Regenerate: gets a fresh token + new QR */}
                            <button
                                onClick={fetchState}
                                className="w-full py-2 text-foreground/40 hover:text-gold text-[9px] uppercase tracking-widest font-bold transition-colors"
                            >
                                ↻ Regenerate QR
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Not Yet Live: countdown + waitlist ── */}
                {state.status === "not_yet_live" && (
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-[9px] font-black uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse inline-block" />
                                Coming Soon
                            </div>
                            <h3 className="text-2xl font-black tracking-tighter">
                                Registration for{" "}
                                <span className="text-gold">{chapter.name}</span>
                                <br />
                                opens in
                            </h3>
                        </div>

                        {/* FlipClock countdown */}
                        <div className="py-2">
                            <FlipClockCountdown
                                targetDate={new Date(state.data.countdownTarget)}
                                size="compact"
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    // Waitlist action: navigate to join page for now
                                    // This can be wired to a waitlist email capture later
                                    window.location.href = "/join";
                                }}
                                className="block w-full py-4 rounded-full bg-gold text-brown font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                            >
                                {state.data.waitlistLabel}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-2 text-foreground/40 hover:text-white text-[9px] uppercase tracking-widest font-bold transition-colors"
                            >
                                I&apos;ll check back later
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Access Denied: witty redirect (no "access denied" language) ── */}
                {state.status === "access_denied" && (
                    <div className="p-8 space-y-6">
                        {/* Subtle visual: music note / wave icon, not a lock */}
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                            <SvgIcon name="music" className="text-gold" size={28} />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xl font-black tracking-tighter leading-tight">
                                {state.data.wittyRedirect}
                            </h3>
                        </div>

                        <div className="space-y-3">
                            <Link
                                href={state.data.redirectHref}
                                onClick={onClose}
                                className="block w-full py-4 rounded-full bg-gold text-brown font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                            >
                                {state.data.redirectLabel}
                            </Link>
                            <button
                                onClick={onClose}
                                className="w-full py-2 text-foreground/40 hover:text-white text-[9px] uppercase tracking-widest font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Error state ── */}
                {state.status === "error" && (
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black tracking-tighter text-foreground/60">
                                Something went sideways
                            </h3>
                            <p className="text-foreground/40 text-sm">{state.message}</p>
                        </div>
                        <button
                            onClick={fetchState}
                            className="block w-full py-4 rounded-full bg-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/15 transition-all"
                        >
                            Try again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ChaptersSection() {
    const chapters = useChaptersWithLiveData();
    const containerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [qrChapter, setQrChapter] = useState<Chapter | null>(null);
    // iOS-style 3D tilt: rotateX/rotateY on each card via GSAP quickTo
    const tiltRefs = useRef<{ rx: gsap.QuickToFunc; ry: gsap.QuickToFunc; scale: gsap.QuickToFunc }[]>([]);


    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, index: number) => {
        const card = cardsRef.current[index];
        const tilt = tiltRefs.current[index];
        if (!card || !tilt) return;

        const rect = card.getBoundingClientRect();
        // Normalized -1 to +1 within the card
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;

        // Tilt up to ±6deg, invert Y so top-hover tilts card back naturally
        tilt.ry(nx * 6);
        tilt.rx(-ny * 4);
        tilt.scale(1.025);
    }, []);

    const handleMouseLeave = useCallback((index: number) => {
        const tilt = tiltRefs.current[index];
        if (!tilt) return;
        tilt.rx(0);
        tilt.ry(0);
        tilt.scale(1);
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            cardsRef.current.forEach((card, index) => {
                if (card) {
                    // iOS spring tilt — no positional shift, only perspective rotation + scale
                    gsap.set(card, { transformPerspective: 800, transformOrigin: "center center" });
                    tiltRefs.current[index] = {
                        rx: gsap.quickTo(card, "rotationX", { duration: 0.4, ease: "power2.out" }),
                        ry: gsap.quickTo(card, "rotationY", { duration: 0.4, ease: "power2.out" }),
                        scale: gsap.quickTo(card, "scale", { duration: 0.35, ease: "power2.out" })
                    };
                }
            });

            gsap.from(".chapter-card", {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%",
                },
                opacity: 0,
                stagger: 0.08,
                duration: 1.2,
                ease: "expo.out"
            });

            gsap.from(".chapter-header", {
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 85%",
                },
                y: 60,
                opacity: 0,
                duration: 1.4,
                ease: "expo.out"
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    const getGridClasses = (size: string) => {
        switch (size) {
            case "hero":
                return "md:col-span-2 md:row-span-2";
            case "featured":
                return "md:col-span-2 md:row-span-1";
            default:
                return "md:col-span-1 md:row-span-1";
        }
    };

    return (
        <section ref={containerRef} className="section-padding bg-background relative overflow-hidden" id="chapters">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-64 h-64 bg-gold/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald/5 rounded-full blur-[150px]" />
            </div>

            <div className="max-container relative z-10">
                {/* ─── HEADER ──────────────────────────────────────────────────────── */}
                {/*
                    Desktop (≥768px): row layout – title on left, description + WhatsApp on right (right‑aligned).
                    Tablet (≥400px and <768px): column with left‑aligned text.
                    Mobile (<400px): column with centered text (left‑aligned fallback).
                */}
                <div className="chapter-header flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-20 max-[400px]:items-center max-[400px]:text-center">
                    {/* Left block: chip + title */}
                    <div className="max-w-2xl space-y-6 max-[400px]:mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-gold text-[10px] font-black uppercase tracking-[0.2em] max-[400px]:mx-auto">
                            <SvgIcon name="location" size={12} /> AFLEWO Chapters
                        </div>
                        <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] max-[400px]:mx-auto">
                            OUR <br /><span className="text-gold">CHAPTERS</span>
                        </h2>
                    </div>

                    {/* Right block: description + WhatsApp link */}
                    <div className="flex flex-col gap-4 text-left md:text-right max-[400px]:text-center max-[400px]:mx-auto">
                        <p className="text-foreground/50 max-w-sm font-bold text-sm uppercase tracking-widest leading-relaxed max-[400px]:mx-auto">
                            A continental network of worship, uniting 8 major hubs across East Africa.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-fr">
                    {chapters.map((chapter, i) => (
                        <div
                            key={i}
                            ref={(el) => { cardsRef.current[i] = el; }}
                            className={`chapter-card bento-card glass-card-elevated p-8 md:p-10 flex flex-col justify-between group cursor-pointer relative overflow-hidden min-h-[280px] rounded-lg ${getGridClasses(chapter.size || "standard")}`}
                            onMouseMove={(e) => handleMouseMove(e, i)}
                            onMouseLeave={() => handleMouseLeave(i)}
                            onClick={() => setSelectedChapter(chapter)}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${chapter.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                            <div className="absolute -right-8 -top-4 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                                <svg viewBox="0 0 32 32" className="w-full h-full fill-current">
                                    <path d="M5.979 10.974v5.021h7.041v11.99h5.042v-11.99h6.958v-5.021h-6.958v-6.958h-5.042v6.958h-7.041z" />
                                </svg>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/80">
                                                {chapter.status}
                                            </span>
                                            {chapter.hasPrayerCircle && (
                                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" /> Live
                                                </span>
                                            )}
                                        </div>
                                        <h3 className={`font-black tracking-tighter group-hover:text-gold transition-colors ${(chapter.size || "standard") === "hero" ? "text-5xl md:text-6xl" :
                                            (chapter.size || "standard") === "featured" ? "text-4xl" : "text-3xl"
                                            }`}>
                                            {chapter.name}
                                        </h3>
                                    </div>
                                    {chapter.hasQr && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setQrChapter(chapter);
                                            }}
                                            className="p-3 glass-card bg-gold/10 border-gold/30 rounded-lg text-gold hover:bg-gold hover:text-brown transition-all"
                                        >
                                            <SvgIcon name="qr" size={20} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-foreground/40 text-sm font-medium leading-relaxed max-w-[300px]">
                                    {chapter.highlight}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-white/5 relative z-10 space-y-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/50">
                                        <SvgIcon name="calendar" size={14} className="text-gold" />
                                        <span>HOME {chapter.established}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/50">
                                        <SvgIcon name="location" size={14} className="text-gold" />
                                        <span className="truncate">{chapter.venue.split(",")[0]}</span>
                                    </div>
                                    {chapter.capacity && (
                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/50">
                                            <SvgIcon name="people" size={14} className="text-gold" />
                                            <span>{chapter.capacity} Attendees</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <Link
                                        href={`/chapters/${chapter.slug}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="press-scale group flex-1 inline-flex items-center justify-between px-5 py-3 glass-card group-hover:bg-gold group-hover:text-brown transition-all duration-500 rounded-full font-black text-[9px] uppercase tracking-widest"
                                    >
                                        Explore Chapter
                                        <div className="relative w-4 h-4 flex items-center justify-center -translate-x-1 group-hover:translate-x-0 transition-transform duration-300">
                                            <SvgIcon name="chevron_idle" size={12} className="absolute rotate-180 opacity-100 group-hover:opacity-0 transition-opacity duration-300" />
                                            <SvgIcon name="chevron_hover" size={12} className="absolute rotate-180 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        </div>
                                    </Link>
                                    {chapter.registrationOpen && (
                                        <span className="px-3 py-1 rounded-full bg-gold/20 text-gold text-[8px] font-black uppercase tracking-widest">
                                            Open
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>
                    ))}
                </div>

                <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-12 glass-card-elevated p-10 md:p-12 rounded-lg border-gold/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[100px] -z-10" />
                    <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="p-5 rounded-lg bg-gold/10 text-gold border border-gold/20 shadow-glow">
                            <SvgIcon name="mail" size={40} className="text-gold" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-3xl font-black tracking-tighter text-white">Start a Chapter</h4>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold/60 max-w-sm">
                                Interested in bringing AFLEWO to your city? Reach out to HQ to begin the conversation.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-shrink-0">
                        <Link
                            href="mailto:nairobi@aflewo.org?subject=New%20Chapter%20Inquiry"
                            className="flex-1 sm:flex-none px-10 py-5 glass-card-elevated hover:bg-white/10 rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border-white/10 whitespace-nowrap"
                        >
                            Email HQ <SvgIcon name="external" size={14} className="text-gold" />
                        </Link>
                        <Link
                            href="https://wa.me/254722819867?text=I%20am%20interested%20in%20starting%20an%20AFLEWO%20chapter"
                            target="_blank"
                            className="flex-1 sm:flex-none px-10 py-5 bg-gold text-brown rounded-lg font-black text-[11px] uppercase tracking-[0.2em] hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-glow whitespace-nowrap"
                        >
                            WhatsApp HQ <SvgIcon name="whatsapp" size={14} />
                        </Link>
                    </div>
                </div>
            </div>

            <ChapterModal
                chapter={selectedChapter}
                isOpen={!!selectedChapter}
                onClose={() => setSelectedChapter(null)}
            />

            <QrModal
                chapter={qrChapter}
                isOpen={!!qrChapter}
                onClose={() => setQrChapter(null)}
            />
        </section>
    );
}