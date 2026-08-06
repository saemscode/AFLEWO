"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import "./OptionWheel.css";

export interface OptionWheelProps {
  items: string[];
  selectedIndex?: number;
  defaultSelected?: number;
  textColor?: string;
  activeColor?: string;
  side?: "left" | "right";
  fontSize?: number;
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  smoothing?: number;
  inset?: number;
  loop?: boolean;
  draggable?: boolean;
  soundUrl?: string;
  soundVolume?: number;
  onChange?: (index: number, item: string) => void;
}

const OptionWheel = memo(
  ({
    items = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
    selectedIndex,
    defaultSelected = 0,
    textColor = "#a6a6a6",
    activeColor = "#ffffff",
    side = "right",
    fontSize = 2.6,
    spacing = 1.35,
    curve = 0.85,
    tilt = 6,
    blur = 2.25,
    fade = 0.25,
    smoothing = 130,
    inset = 56,
    loop = false,
    draggable = true,
    soundUrl,
    soundVolume = 0.5,
    onChange,
  }: OptionWheelProps) => {
    const initialIndex = selectedIndex !== undefined ? selectedIndex : defaultSelected;
    const [selected, setSelected] = useState(initialIndex);
    const [isAudioInitialized, setIsAudioInitialized] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const containerHeight = useRef(0);

    // itemHeight: spacing is a multiplier on font-em
    const itemHeight = spacing * fontSize * 16;
    const totalHeight = items.length * itemHeight;

    // isInternalChangeRef: true ONLY during user drag/click/wheel
    // External selectedIndex prop sync must NOT trigger onChange to avoid infinite loops
    const isInternalChangeRef = useRef(false);

    const scrollY = useSpring(initialIndex * itemHeight, {
      stiffness: smoothing,
      damping: Math.max(15, smoothing * 0.2),
      mass: 0.8,
      restDelta: 0.001,
    });

    // ── External Sync (Controlled Prop → Visual Only) ────────────────────────
    // Only updates the visual position. Does NOT call onChange.
    // This is intentional: the parent (ElasticNavigator) owns activeIndex.
    useEffect(() => {
      if (selectedIndex !== undefined && !isInternalChangeRef.current) {
        setSelected(selectedIndex);
        scrollY.set(selectedIndex * itemHeight);
      }
    }, [selectedIndex, itemHeight, scrollY]);

    // ── Sound Setup ─────────────────────────────────────────────────────────
    useEffect(() => {
      if (!soundUrl) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      fetch(soundUrl)
        .then((res) => res.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          audioBufferRef.current = buffer;
        })
        .catch((err) => console.warn("OptionWheel: Failed to load sound", err));

      return () => {
        ctx.close().catch(() => {});
      };
    }, [soundUrl]);

    const initAudio = useCallback(() => {
      if (!isAudioInitialized && audioContextRef.current) {
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
        setIsAudioInitialized(true);
      }
    }, [isAudioInitialized]);

    const playSound = useCallback(() => {
      if (
        !isAudioInitialized ||
        !audioContextRef.current ||
        !audioBufferRef.current
      ) return;

      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;

      const gainNode = ctx.createGain();
      gainNode.gain.value = soundVolume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    }, [isAudioInitialized, soundVolume]);

    useEffect(() => {
      if (containerRef.current) {
        containerHeight.current = containerRef.current.clientHeight;
      }
    }, []);

    // ── Spring change listener: ONLY updates visual selected state ───────────
    // onChange is called explicitly in action handlers (not here) to prevent
    // multi-fire during spring animation across intermediate indices.
    useEffect(() => {
      const unsub = scrollY.on("change", (v) => {
        let newIndex = Math.round(v / itemHeight);

        if (loop) {
          newIndex = ((newIndex % items.length) + items.length) % items.length;
        } else {
          newIndex = Math.max(0, Math.min(newIndex, items.length - 1));
        }

        if (newIndex !== selected) {
          setSelected(newIndex);
        }
      });
      return unsub;
    }, [scrollY, itemHeight, items, loop, selected]);

    // Helper: clamp and resolve final snap index, then call onChange once
    const commitIndex = useCallback((rawY: number) => {
      let targetIndex = Math.round(rawY / itemHeight);
      if (!loop) {
        targetIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
      } else {
        targetIndex = ((targetIndex % items.length) + items.length) % items.length;
      }
      scrollY.set(targetIndex * itemHeight);
      setSelected(targetIndex);
      playSound();
      if (onChange) onChange(targetIndex, items[targetIndex]);
      return targetIndex;
    }, [itemHeight, items, loop, scrollY, onChange, playSound]);

    // ── Drag handlers ───────────────────────────────────────────────────────
    const handleDrag = (e: any, info: any) => {
      initAudio();
      isInternalChangeRef.current = true;
      const currentY = scrollY.get();
      let newY = currentY - info.delta.y;

      if (!loop) {
        const maxScroll = (items.length - 1) * itemHeight;
        if (newY < 0) newY = newY * 0.5;
        if (newY > maxScroll) newY = maxScroll + (newY - maxScroll) * 0.5;
      }

      scrollY.set(newY);
    };

    const handleDragEnd = (e: any, info: any) => {
      const currentY = scrollY.get();
      const velocity = -info.velocity.y;
      const flingedY = currentY + velocity * 0.2;

      commitIndex(flingedY);

      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 200);
    };

    // ── Item click ──────────────────────────────────────────────────────────
    const handleItemClick = (index: number) => {
      initAudio();
      isInternalChangeRef.current = true;
      let targetIndex = index;

      if (loop) {
        const currentIndex = Math.round(scrollY.get() / itemHeight);
        const currentMod = ((currentIndex % items.length) + items.length) % items.length;
        let diff = index - currentMod;
        if (Math.abs(diff) > items.length / 2) {
          diff -= Math.sign(diff) * items.length;
        }
        targetIndex = currentIndex + diff;
      }

      commitIndex(targetIndex * itemHeight);

      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 200);
    };

    // ── Mouse wheel (on the component itself) ───────────────────────────────
    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      initAudio();
      isInternalChangeRef.current = true;
      const currentY = scrollY.get();
      const flingedY = currentY + e.deltaY;

      commitIndex(flingedY);

      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 200);
    };

    return (
      <div
        ref={containerRef}
        className="option-wheel-container"
        onWheel={handleWheel}
      >
        <motion.div
          className={`option-wheel-drag-zone ${draggable ? "draggable" : ""}`}
          drag={draggable ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ height: items.length * itemHeight }}
        >
          {items.map((item, index) => {
            const itemOffset = index * itemHeight;

            // distance: how far this item is from the current scroll position
            // positive = item is below center, negative = above center
            const distance = useTransform(scrollY, (v) => {
              let d = v - itemOffset;
              if (loop) {
                const halfTotal = totalHeight / 2;
                d = ((d + halfTotal) % totalHeight + totalHeight) % totalHeight - halfTotal;
              }
              return d;
            });

            const normalizedDist = useTransform(distance, (d) => d / itemHeight);

            // curve x: inactive items pushed OFF the right edge (positive x = right)
            // active item: zero curve contribution, only activeX applies
            const x = useTransform(normalizedDist, (d) => {
              const offset = Math.pow(Math.abs(d), 1.8) * 12 * curve;
              // side=right: push inactive items TO THE RIGHT (off screen) → positive x
              // side=left: push inactive items TO THE LEFT (off screen) → negative x
              return side === "right" ? offset : -offset;
            });

            // activeX: pulls the center/active item INWARD from the edge
            const activeX = useTransform(normalizedDist, (d) => {
              const proximity = Math.max(0, 1 - Math.abs(d));
              // side=right: pull active item LEFT (toward center) → negative x
              return side === "right"
                ? -(proximity * inset)
                : (proximity * inset);
            });

            const finalX = useTransform(
              [x, activeX],
              ([baseX, insetX]: any) => (baseX as number) + (insetX as number)
            );

            const rotateZ = useTransform(normalizedDist, (d) => {
              const r = d * tilt;
              // side=right: items above tilt clockwise, below tilt counter-clockwise
              return side === "right" ? r : -r;
            });

            const opacity = useTransform(normalizedDist, (d) => {
              const absD = Math.abs(d);
              if (absD < 0.5) return 1;
              return Math.max(fade, 1 - (absD - 0.5) * 0.5);
            });

            const filter = useTransform(normalizedDist, (d) => {
              const blurAmount = Math.max(0, (Math.abs(d) - 0.3) * blur);
              return `blur(${blurAmount}px)`;
            });

            const isActive = selected === index;

            return (
              <motion.div
                key={index}
                className="option-wheel-item"
                style={{
                  y: useTransform(distance, (d) => -d),
                  x: finalX,
                  rotateZ,
                  opacity,
                  filter,
                  fontSize: `${fontSize}rem`,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? activeColor : textColor,
                  cursor: "pointer",
                  transformOrigin: side === "right" ? "right center" : "left center",
                  top: "50%",
                  right: side === "right" ? 0 : "auto",
                  left: side === "right" ? "auto" : 0,
                }}
                onClick={() => handleItemClick(index)}
              >
                {item}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    );
  }
);

OptionWheel.displayName = "OptionWheel";
export default OptionWheel;
