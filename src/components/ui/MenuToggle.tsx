"use client";

import { useRef, useEffect } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import animationData from "../../../public/menu-close-lottie.json";

/**
 * MenuToggle - Lottie-driven hamburger ↔ close icon
 *
 * Animation map (Q8QSoa57gH.json - 240 frames @ 60fps):
 *   Frame   0  → Menu (3 bars)
 *   Frame  60  → X (cross, fully formed)
 *   Frame 168  → Menu again (end of reverse sequence)
 *
 * On OPEN  (☰→✕): playSegments [0,  60] at 2.5x speed
 * On CLOSE (✕→☰): playSegments [60,  0] at 3.0x speed (reverse playback)
 */

interface MenuToggleProps {
    isOpen: boolean;
    onToggle: () => void;
}

const FRAME_MENU = 0;
const FRAME_X = 60;

export default function MenuToggle({ isOpen, onToggle }: MenuToggleProps) {
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const readyRef = useRef(false);
    const prevRef = useRef<boolean | null>(null);

    // Once Lottie DOM is ready, snap to Menu state silently
    const handleReady = () => {
        lottieRef.current?.setSpeed(2.5);
        lottieRef.current?.goToAndStop(FRAME_MENU, true);
        readyRef.current = true;
        prevRef.current = false;
    };

    useEffect(() => {
        if (!readyRef.current) return;

        // Skip the very first effect fire (mount)
        if (prevRef.current === null) {
            prevRef.current = isOpen;
            lottieRef.current?.goToAndStop(isOpen ? FRAME_X : FRAME_MENU, true);
            return;
        }

        if (prevRef.current === isOpen) return; // no change

        if (isOpen) {
            // ☰ → ✕
            lottieRef.current?.setSpeed(2.5);
            lottieRef.current?.playSegments([FRAME_MENU, FRAME_X], true);
        } else {
            // ✕ → ☰ (play exactly the same opening sequence but in reverse, faster)
            lottieRef.current?.setSpeed(3.0);
            lottieRef.current?.playSegments([FRAME_X, FRAME_MENU], true);
        }

        prevRef.current = isOpen;
    }, [isOpen]);

    return (
        <button
            type="button"
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
            onClick={onToggle}
            // No background/border here - wrapper in Navbar provides that
            className="flex items-center justify-center focus:outline-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            {/* filter:invert(1) converts the dark JSON fill to white */}
            <div style={{ filter: "invert(1)", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lottie
                    lottieRef={lottieRef}
                    animationData={animationData}
                    autoplay={false}
                    loop={false}
                    onDOMLoaded={handleReady}
                    style={{ width: 28, height: 28 }}
                    rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
                />
            </div>
        </button>
    );
}
