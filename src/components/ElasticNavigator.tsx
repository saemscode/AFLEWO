"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import SvgIcon from "@/components/ui/SvgIcon";
import { motion, AnimatePresence } from "framer-motion";
import OptionWheel from "@/components/ui/OptionWheel";
import './ElasticNavigator.css';

// ─── Homepage section IDs (scroll-spy mode) ─────────────────────────────────
const HOME_SECTIONS = [
    { id: "hero",     label: "Home" },
    { id: "about",    label: "About" },
    { id: "chapters", label: "Chapters" },
    { id: "events",   label: "Events" },
    { id: "media",    label: "Media" },
    { id: "stories",  label: "Stories" },
    { id: "join",     label: "Join" },
];

// ─── Page nav items (page-link mode, all inner pages) ───────────────────────
const PAGE_LINKS = [
    { label: "Home",     href: "/" },
    { label: "About",    href: "/about" },
    { label: "Chapters", href: "/chapters" },
    { label: "Events",   href: "/events" },
    { label: "Media",    href: "/media" },
    { label: "Testify",  href: "/testify" },
    { label: "Join",     href: "/join" },
];

const HOME_SECTION_LABELS = HOME_SECTIONS.map((s) => s.label);
const PAGE_LINK_LABELS    = PAGE_LINKS.map((p) => p.label);

const HINT_STORAGE_KEY = "aflewo_wheel_hint_count";
const HINT_MAX_SHOWS   = 3;

function getHintCount(): number {
    try { return parseInt(localStorage.getItem(HINT_STORAGE_KEY) || "0", 10); }
    catch { return 0; }
}
function incrementHintCount(): void {
    try { localStorage.setItem(HINT_STORAGE_KEY, String(getHintCount() + 1)); }
    catch { /* ignore */ }
}

export default function ElasticNavigator() {
    const pathname  = usePathname();
    const router    = useRouter();
    const isHome    = pathname === "/";

    const [isVisible,   setIsVisible]   = useState(false);
    const [isExpanded,  setIsExpanded]  = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isIdle,      setIsIdle]      = useState(false);
    const [showHint,    setShowHint]    = useState(false);

    const idleTimeoutRef = useRef<number | null>(null);
    const isScrollingRef = useRef(false);

    // ─── Resolve active page-link index for inner pages ─────────────────
    const pageActiveIndex = PAGE_LINKS.findIndex((p) => {
        if (p.href === "/") return pathname === "/";
        return pathname.startsWith(p.href);
    });
    const resolvedActiveIndex = isHome ? activeIndex : (pageActiveIndex >= 0 ? pageActiveIndex : 0);

    const resetIdleTimeout = useCallback((delay: number) => {
        setIsIdle(false);
        if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = window.setTimeout(() => setIsIdle(true), delay);
    }, []);

    // ─── Homepage scroll-spy ─────────────────────────────────────────────
    useEffect(() => {
        // On inner pages: always visible, no scroll-spy needed
        if (!isHome) {
            setIsVisible(true);
            return;
        }

        const handleInteraction = () => resetIdleTimeout(5000);

        const handleScroll = () => {
            handleInteraction();
            setIsVisible(window.scrollY > 80);
            if (isScrollingRef.current) return;

            const viewportCenter = window.scrollY + window.innerHeight / 2;
            let closestIndex = 0;
            let minDistance  = Infinity;

            HOME_SECTIONS.forEach((section, index) => {
                const el = document.getElementById(section.id);
                if (el) {
                    const absoluteTop = el.getBoundingClientRect().top + window.scrollY;
                    const distance    = Math.abs(absoluteTop - viewportCenter);
                    if (distance < minDistance) { minDistance = distance; closestIndex = index; }
                }
            });
            setActiveIndex(closestIndex);
        };

        window.addEventListener("scroll",     handleScroll,     { passive: true });
        window.addEventListener("mousemove",  handleInteraction);
        window.addEventListener("keydown",    handleInteraction);
        window.addEventListener("touchstart", handleInteraction);
        handleScroll();

        return () => {
            window.removeEventListener("scroll",     handleScroll);
            window.removeEventListener("mousemove",  handleInteraction);
            window.removeEventListener("keydown",    handleInteraction);
            window.removeEventListener("touchstart", handleInteraction);
            if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
        };
    }, [isHome, resetIdleTimeout]);

    // ─── Wheel change handler ────────────────────────────────────────────
    const handleWheelChange = useCallback((index: number) => {
        if (isHome) {
            // Section-scroll mode — same logic as before, no re-entry
            if (index === activeIndex) return;
            setActiveIndex(index);
            const targetSection = document.getElementById(HOME_SECTIONS[index].id);
            if (targetSection) {
                isScrollingRef.current = true;
                const absoluteTop = targetSection.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: absoluteTop, behavior: "smooth" });
                setTimeout(() => { isScrollingRef.current = false; }, 900);
            }
        } else {
            // Page-nav mode: push route, close wheel
            const target = PAGE_LINKS[index];
            if (target && target.href !== pathname) {
                setIsExpanded(false);
                router.push(target.href);
            }
        }
    }, [isHome, activeIndex, pathname, router]);

    // ─── Open wheel + manage first-timer hint ───────────────────────────
    const handleOpen = useCallback(() => {
        setIsExpanded(true);
        resetIdleTimeout(8000);
        const count = getHintCount();
        if (count < HINT_MAX_SHOWS) {
            setShowHint(true);
            incrementHintCount();
            setTimeout(() => setShowHint(false), 4000);
        }
    }, [resetIdleTimeout]);

    const items  = isHome ? HOME_SECTION_LABELS : PAGE_LINK_LABELS;
    const selIdx = resolvedActiveIndex;

    return (
        <>
            {/* ── FAB trigger — w-16 h-16, matching AIAssistant FAB exactly ── */}
            <AnimatePresence>
                {isVisible && !isExpanded && (
                    <motion.button
                        key="nav-fab"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: isIdle ? 0.28 : 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25, opacity: { duration: 1.2, ease: "easeInOut" } }}
                        className="fixed right-8 bottom-28 z-[101] w-16 h-16 rounded-full flex items-center justify-center border border-white/10 hover:border-white/30 cursor-pointer overflow-hidden group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                        style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                        }}
                        onClick={handleOpen}
                        whileHover={{ scale: 1.08, opacity: 1 }}
                        whileTap={{ scale: 0.94 }}
                        aria-label="Open page navigator"
                        onPointerEnter={() => {
                            setIsIdle(false);
                            if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
                        }}
                        onPointerLeave={() => resetIdleTimeout(4000)}
                    >
                        {/* Glossy inset ring — identical to AIAssistant FAB */}
                        <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent z-10 pointer-events-none" />

                        {/* Hover glow — static tint only, NO animate-ping */}
                        <div className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/8 transition-colors duration-300 z-0 pointer-events-none" />

                        <div className="relative z-20 flex items-center justify-center">
                            <SvgIcon name="navigation" size={26} className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]" />
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── Wheel overlay ── */}
            <AnimatePresence>
                {isExpanded && (
                    <>
                        {/* Invisible full-screen backdrop — tap anywhere outside wheel to dismiss */}
                        <motion.div
                            key="nav-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[99]"
                            style={{ background: "transparent" }}
                            onClick={() => setIsExpanded(false)}
                            aria-label="Close navigator"
                        />

                        {/* First-timer hint pill — no extra containers, lightweight */}
                        <AnimatePresence>
                            {showHint && (
                                <motion.div
                                    key="wheel-hint"
                                    initial={{ opacity: 0, y: 6, scale: 0.94 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.94 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                    className="fixed right-28 bottom-32 z-[102] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.18em] text-white/60 pointer-events-none select-none"
                                    style={{
                                        background: "rgba(255,255,255,0.06)",
                                        backdropFilter: "blur(16px)",
                                        WebkitBackdropFilter: "blur(16px)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    Tap outside to close
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Wheel — slides in from right, no panel behind it */}
                        <motion.div
                            key="wheel-overlay"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 36 }}
                            className="fixed inset-y-0 right-0 z-[100] flex items-center justify-end"
                            style={{ width: "280px", pointerEvents: "none", overflow: "visible" }}
                        >
                            <div
                                style={{ width: "280px", height: "480px", pointerEvents: "auto", position: "relative", overflow: "visible" }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <OptionWheel
                                    items={items}
                                    selectedIndex={selIdx}
                                    onChange={handleWheelChange}
                                    textColor="#a6a6a6"
                                    activeColor="#D4AF37"
                                    side="right"
                                    fontSize={2.6}
                                    spacing={1.35}
                                    curve={0.85}
                                    tilt={6}
                                    blur={2.25}
                                    fade={0.25}
                                    smoothing={130}
                                    inset={56}
                                    loop={false}
                                    draggable={true}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}