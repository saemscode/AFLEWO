"use client";

import { useParams, notFound } from "next/navigation";
import { getChapter } from "@/lib/chapters";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import SvgIcon from "@/components/ui/SvgIcon";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// ─── Spring presets (Apple WWDC 2018 - Designing Fluid Interfaces) ─────────────
// Critically damped = no overshoot. response ≈ 0.35s → stiffness/damping mapped.
const SPRING_DEFAULT = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;
const SPRING_ENTRANCE = { type: "spring", stiffness: 260, damping: 32, mass: 1.0 } as const;

// ─── Register Modal ────────────────────────────────────────────────────────────
interface RegisterFormState { name: string; email: string; phone: string; }

function RegisterModal({ chapterName, eventName, onClose }: { chapterName: string; eventName: string; onClose: () => void }) {
    const shouldReduceMotion = useReducedMotion();
    const [form, setForm] = useState<RegisterFormState>({ name: "", email: "", phone: "" });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handler); };
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await new Promise((r) => setTimeout(r, 1000));
        const subject = encodeURIComponent(`AFLEWO ${chapterName} Registration - ${eventName}`);
        const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nChapter: ${chapterName}\nEvent: ${eventName}`);
        window.location.href = `mailto:${chapterName.toLowerCase()}@aflewo.org?subject=${subject}&body=${body}`;
        setSubmitting(false);
        setSubmitted(true);
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.1 : 0.22 }}
                onClick={onClose}
            >
                {/* Scrim */}
                <div className="absolute inset-0 bg-black/75 backdrop-blur-2xl" />

                {/* Sheet - enters from bottom on mobile (Apple sheet pattern), centered on desktop */}
                <motion.div
                    className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden border border-white/10"
                    style={{ background: "rgba(12,10,8,0.92)", backdropFilter: "blur(40px) saturate(180%)" }}
                    initial={shouldReduceMotion ? { opacity: 0 } : { y: 60, opacity: 0, scale: 0.97 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.97 }}
                    transition={shouldReduceMotion ? { duration: 0.15 } : SPRING_ENTRANCE}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Gold top rule - material light-catch edge */}
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

                    <div className="p-8 space-y-7">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold/70 mb-1">
                                    {chapterName} Chapter
                                </p>
                                <h3 className="text-2xl font-black tracking-tight leading-none">
                                    Register <span className="text-gold">Now</span>
                                </h3>
                            </div>
                            <motion.button
                                onClick={onClose}
                                whileTap={{ scale: 0.92 }}
                                transition={SPRING_DEFAULT}
                                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/6 hover:bg-white/12 text-white/50 hover:text-white transition-colors"
                                style={{ WebkitTapHighlightColor: "transparent" }}
                            >
                                <SvgIcon name="close" size={16} />
                            </motion.button>
                        </div>

                        {submitted ? (
                            <motion.div
                                className="text-center py-10 space-y-4"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={SPRING_DEFAULT}
                            >
                                <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto">
                                    <SvgIcon name="check_circle" size={32} className="text-gold" />
                                </div>
                                <h4 className="text-xl font-black tracking-tight">Registration Sent!</h4>
                                <p className="text-white/40 text-sm leading-relaxed">
                                    We&apos;ll confirm to <span className="text-white/70">{form.email}</span> within 24 hours.
                                </p>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {([
                                    { key: "name", label: "Full Name", type: "text", placeholder: "Your full name" },
                                    { key: "email", label: "Email", type: "email", placeholder: "you@email.com" },
                                    { key: "phone", label: "Phone (optional)", type: "tel", placeholder: "+254 700 000 000" },
                                ] as const).map(({ key, label, type, placeholder }) => (
                                    <div key={key} className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">{label}</label>
                                        <input
                                            type={type}
                                            required={key !== "phone"}
                                            value={form[key]}
                                            onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-gold/50 rounded-xl py-3 px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20"
                                        />
                                    </div>
                                ))}
                                <motion.button
                                    type="submit"
                                    disabled={submitting}
                                    whileTap={{ scale: 0.97 }}
                                    transition={SPRING_DEFAULT}
                                    className="w-full mt-2 py-4 bg-gold text-brown rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ WebkitTapHighlightColor: "transparent" }}
                                >
                                    {submitting
                                        ? <><SvgIcon name="loader" size={16} className="animate-spin" /> Sending…</>
                                        : <><SvgIcon name="send" size={16} /> Confirm Registration</>
                                    }
                                </motion.button>
                            </form>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Stat Tile ─────────────────────────────────────────────────────────────────
function StatTile({ icon, label, value, delay = 0 }: { icon: string; label: string; value: string; delay?: number }) {
    const shouldReduceMotion = useReducedMotion();
    return (
        <motion.div
            className="group relative flex flex-col gap-3 p-6 rounded-2xl border border-white/6 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.2 } : { ...SPRING_ENTRANCE, delay }}
            whileHover={{ borderColor: "rgba(212,175,55,0.2)" }}
        >
            {/* Ambient glow on hover */}
            <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/3 transition-colors duration-500 pointer-events-none rounded-2xl" />
            <SvgIcon name={icon} size={20} className="text-gold/60" />
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">{label}</p>
                <p className="text-base font-black tracking-tight text-white">{value}</p>
            </div>
        </motion.div>
    );
}

// ─── Contact Row ───────────────────────────────────────────────────────────────
function ContactRow({ icon, label, value, href }: { icon: string; label: string; value: string; href: string }) {
    return (
        <motion.a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-center gap-4 group"
            whileTap={{ scale: 0.97 }}
            transition={SPRING_DEFAULT}
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/8 bg-white/4 group-hover:bg-gold/15 group-hover:border-gold/30 transition-all duration-300">
                <SvgIcon name={icon} size={17} className="text-gold/70 group-hover:text-gold transition-colors" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-white/60 group-hover:text-white transition-colors truncate">{value}</p>
            </div>
            <SvgIcon name="chevron_right" size={14} className="text-white/15 group-hover:text-gold/50 transition-colors ml-auto shrink-0" />
        </motion.a>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ChapterPage() {
    const { slug } = useParams();
    const chapter = getChapter(slug as string);
    const shouldReduceMotion = useReducedMotion();
    const [showRegister, setShowRegister] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!chapter) return notFound();

    const stagger = (i: number) => shouldReduceMotion ? { duration: 0.15 } : { ...SPRING_ENTRANCE, delay: i * 0.07 };

    return (
        <main className="bg-background min-h-screen">
            <AnimatePresence>
                {showRegister && (
                    <RegisterModal
                        chapterName={chapter.name}
                        eventName={chapter.upcomingEvent || "2026 Season"}
                        onClose={() => setShowRegister(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── HERO - Image preserved as-is per instruction ─────────────────── */}
            <section className="relative h-[65vh] min-h-[480px] flex items-end overflow-hidden">
                <Image
                    src={chapter.venueImage || "/archival-1.jpg"}
                    alt={`AFLEWO ${chapter.name}`}
                    fill
                    className="object-cover"
                    priority
                />
                {/* Deep gradient: content readable, image visible at top */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                {/* Subtle side vignette */}
                <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-transparent" />

                <div className="relative z-10 w-full px-6 pb-12 max-container">
                    {/* Back nav - responds on press */}
                    <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={stagger(0)}
                        className="mb-8"
                    >
                        <Link
                            href="/chapters"
                            className="inline-flex items-center gap-2 text-white/40 hover:text-gold text-[9px] font-black uppercase tracking-[0.3em] transition-colors group"
                        >
                            <SvgIcon name="arrow_back" size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                            All Chapters
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={stagger(1)}
                        className="space-y-3"
                    >
                        {/* Status + flag row */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xl leading-none">{chapter.flag}</span>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-gradient-to-r ${chapter.color} text-white border border-white/10`}>
                                {chapter.status}
                            </span>
                            {chapter.registrationOpen && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[9px] font-black uppercase tracking-[0.2em]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Open
                                </span>
                            )}
                        </div>

                        {/* Display headline - tight tracking, large scale */}
                        <h1 className="text-[clamp(3rem,12vw,7rem)] font-black leading-[0.88] tracking-tighter text-white">
                            AFLEWO<br />
                            <span className="text-gold">{chapter.name.toUpperCase()}</span>
                        </h1>

                        <p className="text-white/35 text-[10px] font-black uppercase tracking-[0.35em]">
                            {chapter.country} · Est. {chapter.established}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ── BODY ──────────────────────────────────────────────────────────── */}
            <section className="px-6 py-16">
                <div className="max-container grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">

                    {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
                    <div className="space-y-14">

                        {/* Chapter description */}
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={stagger(2)}
                            className="space-y-4 border-l-2 border-gold/30 pl-7"
                        >
                            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-gold/60">Chapter Overview</p>
                            <p className="text-lg text-white/55 leading-relaxed font-medium">{chapter.description}</p>
                        </motion.div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatTile icon="calendar_month" label="Established" value={`AFLEWO ${chapter.established}`} delay={0.1} />
                            <StatTile icon="location_on" label="Primary Venue" value={chapter.venue} delay={0.15} />
                            {chapter.capacity && <StatTile icon="groups" label="Peak Capacity" value={`${chapter.capacity} Souls`} delay={0.2} />}
                            <StatTile icon="flag" label="Nation" value={`${chapter.flag} ${chapter.country}`} delay={0.25} />
                        </div>

                        {/* Upcoming event card */}
                        {chapter.upcomingEvent && (
                            <motion.div
                                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={stagger(3)}
                                className="relative rounded-3xl overflow-hidden border border-gold/15 p-8 space-y-6"
                                style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 100%)" }}
                            >
                                {/* Decorative top edge */}
                                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1.5">
                                        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-gold/70">Upcoming Event</p>
                                        <h3 className="text-xl font-black tracking-tight leading-snug">{chapter.upcomingEvent}</h3>
                                        {chapter.hasPrayerCircle && (
                                            <p className="text-white/40 text-[11px] font-bold mt-1">
                                                Every night at 9:00 PM EAT · Zoom
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                                        <SvgIcon name="event" size={22} className="text-gold" />
                                    </div>
                                </div>

                                {chapter.registrationOpen && (
                                    <motion.button
                                        onClick={() => setShowRegister(true)}
                                        whileTap={{ scale: 0.97 }}
                                        transition={SPRING_DEFAULT}
                                        className="w-full py-4 rounded-2xl bg-gold text-brown font-black text-[11px] uppercase tracking-[0.25em] hover:brightness-110 transition-all flex items-center justify-center gap-2.5"
                                        style={{ WebkitTapHighlightColor: "transparent" }}
                                    >
                                        <SvgIcon name="check_circle" size={17} />
                                        Register for This Event
                                    </motion.button>
                                )}
                                {chapter.link && !chapter.registrationOpen && (
                                    <motion.a
                                        href={chapter.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileTap={{ scale: 0.97 }}
                                        transition={SPRING_DEFAULT}
                                        className="block w-full py-4 rounded-2xl bg-gold text-brown font-black text-[11px] uppercase tracking-[0.25em] hover:brightness-110 transition-all text-center"
                                        style={{ WebkitTapHighlightColor: "transparent" }}
                                    >
                                        Open Registration Link
                                    </motion.a>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* ── RIGHT SIDEBAR (sticky on desktop) ────────────────────── */}
                    <div className="space-y-4 lg:sticky lg:top-24">

                        {/* Contact card */}
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(2)}
                            className="rounded-3xl border border-white/6 p-6 space-y-5"
                            style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}
                        >
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Contact & Connect</p>
                            <div className="space-y-4 divide-y divide-white/5">
                                {chapter.contactPhone && (
                                    <ContactRow icon="call" label="Call Us" value={chapter.contactPhone} href={`tel:${chapter.contactPhone}`} />
                                )}
                                {chapter.contactEmail && (
                                    <div className="pt-4">
                                        <ContactRow icon="mail" label="Email Us" value={chapter.contactEmail} href={`mailto:${chapter.contactEmail}`} />
                                    </div>
                                )}
                                {chapter.whatsappLink && (
                                    <div className="pt-4">
                                        <ContactRow icon="forum" label="WhatsApp Group" value="Join Community" href={chapter.whatsappLink} />
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Prophetic identity card - the signature element */}
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(3)}
                            className="rounded-3xl border border-gold/10 p-6 space-y-4 text-center overflow-hidden relative"
                            style={{ background: "linear-gradient(160deg, rgba(212,175,55,0.06) 0%, rgba(0,0,0,0) 60%)" }}
                        >
                            {/* Radial glow */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
                            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gold/40">Prophetic Pillar</p>
                            <p className="text-2xl font-black tracking-tight text-white/80 italic leading-snug">
                                &ldquo;The Sound<br />of {chapter.name}&rdquo;
                            </p>
                            <div className="w-8 h-px bg-gold/30 mx-auto" />
                            <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em]">
                                Est. {chapter.established} · {chapter.country}
                            </p>
                        </motion.div>

                        {/* Give / M-Pesa card */}
                        <motion.div
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(4)}
                            className="rounded-3xl border border-white/6 p-6 space-y-4"
                            style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)" }}
                        >
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Support This Chapter</p>
                            <div className="space-y-1">
                                <p className="text-[9px] text-white/25 font-bold uppercase tracking-widest">M-Pesa Paybill</p>
                                <p className="text-3xl font-black text-gold tracking-tight">819867</p>
                                <p className="text-[10px] text-white/25 font-bold">Account: AFLEWO {chapter.name}</p>
                            </div>
                            <motion.a
                                href="tel:*456*819867#"
                                whileTap={{ scale: 0.96 }}
                                transition={SPRING_DEFAULT}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-gold/20 bg-gold/5 hover:bg-gold/12 text-gold text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                                style={{ WebkitTapHighlightColor: "transparent" }}
                            >
                                <SvgIcon name="call" size={14} />
                                Dial *456*819867#
                            </motion.a>
                        </motion.div>

                        {/* Back link */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ ...SPRING_ENTRANCE, delay: 0.5 }}
                        >
                            <Link
                                href="/chapters"
                                className="flex items-center gap-2 text-white/25 hover:text-gold transition-colors text-[9px] font-black uppercase tracking-[0.3em] group px-2"
                            >
                                <SvgIcon name="arrow_back" size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                                View All Chapters
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
