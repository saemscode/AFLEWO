"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import SvgIcon from "@/components/ui/SvgIcon";
import { motion, AnimatePresence } from "framer-motion";
import OptionWheel from "@/components/ui/OptionWheel";
import './ElasticNavigator.css';

const sections = [
    { id: "hero", label: "Home" },
    { id: "about", label: "About" },
    { id: "chapters", label: "Chapters" },
    { id: "events", label: "Events" },
    { id: "media", label: "Media" },
    { id: "stories", label: "Stories" },
    { id: "join", label: "Join" },
];

const SECTION_LABELS = sections.map(s => s.label);

export default function ElasticNavigator() {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isIdle, setIsIdle] = useState(false);

    const idleTimeoutRef = useRef<number | null>(null);
    // Flag: true only while wheel-initiated scrollTo is in progress
    // Prevents scroll spy from triggering a second scrollTo
    const isScrollingRef = useRef(false);

    const resetIdleTimeout = useCallback((delay: number) => {
        setIsIdle(false);
        if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = window.setTimeout(() => setIsIdle(true), delay);
    }, []);

    // 1. Wheel-to-Scroll: User interacts with OptionWheel → page scrolls
    const handleWheelChange = useCallback((index: number) => {
        if (index === activeIndex) return;
        setActiveIndex(index);

        const targetSection = document.getElementById(sections[index].id);
        if (targetSection) {
            isScrollingRef.current = true;
            const absoluteTop = targetSection.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: absoluteTop, behavior: "smooth" });
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 900);
        }
    }, [activeIndex]);

    // 2. Scroll-to-Wheel: Page scroll passively updates wheel indicator — NO scroll hijacking
    useEffect(() => {
        const handleInteraction = () => resetIdleTimeout(5000);

        const handleScroll = () => {
            handleInteraction();
            setIsVisible(window.scrollY > 80);

            // Only update the indicator while the user is freely scrolling
            // When isScrollingRef is true, a wheel-initiated scroll is running — skip to avoid re-entry
            if (isScrollingRef.current) return;

            const viewportCenter = window.scrollY + window.innerHeight / 2;
            let closestIndex = 0;
            let minDistance = Infinity;

            sections.forEach((section, index) => {
                const el = document.getElementById(section.id);
                if (el) {
                    const absoluteTop = el.getBoundingClientRect().top + window.scrollY;
                    const distance = Math.abs(absoluteTop - viewportCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                }
            });

            // Only update active indicator — does NOT call handleWheelChange, does NOT scrollTo anything
            setActiveIndex(closestIndex);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
        };
    }, [resetIdleTimeout]);  // ← removed activeIndex from deps — scroll spy never calls handleWheelChange

    return (
        <>
            {/* ── FAB trigger ── */}
            <AnimatePresence>
                {isVisible && !isExpanded && (
                    <motion.button
                        key="fab"
                        initial={{ x: 80, opacity: 0 }}
                        animate={{ x: 0, opacity: isIdle ? 0.05 : 1 }}
                        exit={{ x: 80, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        className="fixed right-8 bottom-28 z-[101] w-14 h-14 rounded-full flex items-center justify-center border border-white/10 hover:border-white/30 cursor-pointer overflow-hidden group"
                        style={{
                            background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
                        }}
                        onClick={() => {
                            setIsExpanded(true);
                            resetIdleTimeout(8000);
                        }}
                        whileHover={{ scale: 1.08, y: -2 }}
                        whileTap={{ scale: 0.93 }}
                        aria-label="Open page navigator"
                        onPointerEnter={() => {
                            setIsIdle(false);
                            if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
                        }}
                        onPointerLeave={() => resetIdleTimeout(4000)}
                    >
                        <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-white/20 to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 group-hover:animate-ping z-0 pointer-events-none" />
                        <div className="relative z-20 flex items-center justify-center">
                            <SvgIcon name="navigation" size={24} className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]" />
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
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[99]"
                            style={{ background: "transparent" }}
                            onClick={() => setIsExpanded(false)}
                            aria-label="Close navigator"
                        />

                        {/* Wheel — slides in from right, floats freely with no panel */}
                        <motion.div
                            key="wheel-overlay"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 36 }}
                            className="fixed inset-y-0 right-0 z-[100] flex items-center justify-end"
                            style={{
                                // Width needs to accommodate the largest label at 2.6rem
                                // plus inset offset. "Chapters" ≈ 160px at 2.6rem, +56px inset = ~220px
                                width: "280px",
                                pointerEvents: "none",
                                overflow: "visible",
                            }}
                        >
                            <div
                                style={{
                                    width: "280px",
                                    height: "480px",
                                    pointerEvents: "auto",
                                    position: "relative",
                                    overflow: "visible",
                                }}
                                // Stop tap-inside from bubbling up to backdrop
                                onClick={(e) => e.stopPropagation()}
                            >
                                <OptionWheel
                                    items={SECTION_LABELS}
                                    selectedIndex={activeIndex}
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