"use client";

import Footer from "@/components/Footer";
import { useCallback, useEffect, useRef, useState } from "react";
import SvgIcon from "@/components/ui/SvgIcon";
import { supabase } from "@/integrations/supabase/client";
import ProtectedCanvas from "@/components/ui/ProtectedCanvas";
import { AnimatePresence, motion } from "framer-motion";

// ─── Image Catalog ──────────────────────────────────────────────────────────
type GalleryItem = {
  id: string | number;
  src: string;
  title: string;
  chapter: string;
  year: string;
  category: string;
  desc: string;
  wide?: boolean; // spans 2 columns in the grid
};

const localGallery: GalleryItem[] = [
  // ── bg series ──
  { id: 1, src: "/images/gallery/bg1.jpg.jpeg", title: "The Altar of Thousands", chapter: "Nairobi", year: "2024", category: "Gatherings", desc: "Grace for Wholeness - October 2024", wide: true },
  { id: 2, src: "/images/gallery/bg2.jpg.jpeg", title: "Continental Sound", chapter: "Nairobi", year: "2023", category: "Gatherings", desc: "Night of Wholeness - Winners Chapel International" },
  { id: 3, src: "/images/gallery/bg3.jpg.jpeg", title: "African Vigil Night", chapter: "Mombasa", year: "2022", category: "Gatherings", desc: "Coastal intercession gathering" },
  { id: 4, src: "/images/gallery/bg4.jpg.jpeg", title: "House of Prayer", chapter: "Tanzania", year: "2023", category: "Worship", desc: "CCC Upanga Church, Dar es Salaam" },
  { id: 5, src: "/images/gallery/bg5.jpg.jpeg", title: "The Sound Goes Out", chapter: "Rwanda", year: "2014", category: "Worship", desc: "20-year commemoration service, Kigali" },
  { id: 6, src: "/images/gallery/bg6.jpg.jpeg", title: "Nakuru Season Launch", chapter: "Nakuru", year: "2022", category: "Gatherings", desc: "Deliverance Church opening night" },
  { id: 7, src: "/images/gallery/bg7.jpg.jpeg", title: "The First Altar", chapter: "Nairobi", year: "2004", category: "Archive", desc: "CITAM Karen - the inaugural AFLEWO gathering", wide: true },

  // ── numbered series (01–12, two variants each) ──
  { id: 8, src: "/images/gallery/01.jpg_1.jpeg", title: "Opening Worship", chapter: "Nairobi", year: "2023", category: "Worship", desc: "Pre-event gathering, 2023" },
  { id: 9, src: "/images/gallery/01.jpg_2.jpeg", title: "Choir Rehearsal", chapter: "Nairobi", year: "2024", category: "Behind the Scenes", desc: "Choir warm-up session" },
  { id: 10, src: "/images/gallery/02.jpg.jpeg", title: "JCC Bamburi Centre", chapter: "Mombasa", year: "2022", category: "Worship", desc: "Coastal evening prayer" },
  { id: 11, src: "/images/gallery/02.jpg_1.jpeg", title: "Mombasa Congregation", chapter: "Mombasa", year: "2022", category: "Gatherings", desc: "JCC Bamburi Centre" },
  { id: 12, src: "/images/gallery/03.jpg.jpeg", title: "A Decade of Grace", chapter: "Nairobi", year: "2013", category: "Archive", desc: "10th anniversary, Sarit Centre" },
  { id: 13, src: "/images/gallery/03.jpg_1.jpeg", title: "Memory Lane", chapter: "Nairobi", year: "2013", category: "Archive", desc: "Behind the scenes - decade celebration" },
  { id: 14, src: "/images/gallery/04.jpg.jpeg", title: "Sound of One Voice", chapter: "Nairobi", year: "2016", category: "Worship", desc: "1,000-voice national choir event" },
  { id: 15, src: "/images/gallery/04.jpg_1.jpeg", title: "Band Setup", chapter: "Nairobi", year: "2016", category: "Behind the Scenes", desc: "Pre-show production setup" },
  { id: 16, src: "/images/gallery/05.jpg.jpeg", title: "Rwanda Reconciliation", chapter: "Rwanda", year: "2014", category: "Worship", desc: "Annual healing worship - April 7th", wide: true },
  { id: 17, src: "/images/gallery/05.jpg_1.jpeg", title: "Kigali Overflow", chapter: "Rwanda", year: "2014", category: "Gatherings", desc: "Outside the venue - overflow crowd" },
  { id: 18, src: "/images/gallery/06.jpg.jpeg", title: "Tanzania Night", chapter: "Tanzania", year: "2019", category: "Gatherings", desc: "Dar es Salaam chapter gathering" },
  { id: 19, src: "/images/gallery/06.jpg_1.jpeg", title: "Tanzania Praise", chapter: "Tanzania", year: "2019", category: "Worship", desc: "Congregational worship, Dar es Salaam" },
  { id: 20, src: "/images/gallery/07.jpg.jpeg", title: "Morning Devotion", chapter: "Nakuru", year: "2021", category: "Worship", desc: "Dawn prayer session, Nakuru chapter" },
  { id: 21, src: "/images/gallery/07.jpg_1.jpeg", title: "Rift Valley Rising", chapter: "Nakuru", year: "2021", category: "Gatherings", desc: "Rift Valley chapter milestone event" },
  { id: 22, src: "/images/gallery/08.jpg.jpeg", title: "Nairobi Overflow Night", chapter: "Nairobi", year: "2023", category: "Gatherings", desc: "Winners Chapel capacity crowd", wide: true },
  { id: 23, src: "/images/gallery/08.jpg_1.jpeg", title: "Stage Preparation", chapter: "Nairobi", year: "2023", category: "Behind the Scenes", desc: "Sound check before the main event" },
  { id: 24, src: "/images/gallery/09.jpg.jpeg", title: "Children of Worship", chapter: "Nairobi", year: "2022", category: "Community", desc: "Youth worship wing in action" },
  { id: 25, src: "/images/gallery/09.jpg_1.jpeg", title: "Family of Faith", chapter: "Nairobi", year: "2022", category: "Community", desc: "Families gathered together in worship" },
  { id: 26, src: "/images/gallery/10.jpg.jpeg", title: "Midnight Cry", chapter: "Mombasa", year: "2019", category: "Worship", desc: "Coastal midnight worship session" },
  { id: 27, src: "/images/gallery/10.jpg_1.jpeg", title: "The Prayer Wall", chapter: "Mombasa", year: "2019", category: "Worship", desc: "Intercessory prayer corner" },
  { id: 28, src: "/images/gallery/11.jpg.jpeg", title: "Continental Assembly", chapter: "Nairobi", year: "2024", category: "Gatherings", desc: "All-chapter continental summit", wide: true },
  { id: 29, src: "/images/gallery/11.jpg_1.jpeg", title: "Leaders' Meeting", chapter: "Nairobi", year: "2024", category: "Community", desc: "Leadership roundtable - AFLEWO summit" },
  { id: 30, src: "/images/gallery/12.jpg.jpeg", title: "Golden Jubilee of Sound", chapter: "Nairobi", year: "2024", category: "Archive", desc: "20-year commemorative gathering" },
  { id: 31, src: "/images/gallery/12.jpg_1.jpeg", title: "The Legacy Continues", chapter: "Nairobi", year: "2024", category: "Archive", desc: "Documentation of the 2024 milestone" },

  // ── Instagram series ──
  { id: 32, src: "/images/gallery/aflewoke_1732606933_3509683799022924098_1933161197.jpg", title: "Live Worship Moment", chapter: "Nairobi", year: "2024", category: "Worship", desc: "Spontaneous worship captured live" },
  { id: 33, src: "/images/gallery/aflewoke_1732606933_3509683799031482459_1933161197.jpg", title: "Congregation in Motion", chapter: "Nairobi", year: "2024", category: "Gatherings", desc: "Standing ovation during the altar call" },
  { id: 34, src: "/images/gallery/aflewoke_1732606933_3509683799039873799_1933161197.jpg", title: "Hands Raised High", chapter: "Nairobi", year: "2024", category: "Worship", desc: "Corporate surrender during praise" },
  { id: 35, src: "/images/gallery/aflewoke_1732606933_3509683799115226364_1933161197.jpg", title: "The Sound of Africa", chapter: "Nairobi", year: "2024", category: "Worship", desc: "Worship carrying the African sound", wide: true },

  // ── portrait series ──
  { id: 36, src: "/images/gallery/p1.jpg.jpeg", title: "Voice of the Movement", chapter: "Nairobi", year: "2023", category: "Community", desc: "Featured worship leader" },
  { id: 37, src: "/images/gallery/p2.jpg.jpeg", title: "Choir Section", chapter: "Nairobi", year: "2023", category: "Community", desc: "Alto section rehearsal" },
  { id: 38, src: "/images/gallery/p3.jpg.jpeg", title: "Keys Ministry", chapter: "Nairobi", year: "2022", category: "Behind the Scenes", desc: "Keyboard ministry" },
  { id: 39, src: "/images/gallery/p4.jpg.jpeg", title: "Praise Leader", chapter: "Mombasa", year: "2022", category: "Community", desc: "Coastal praise leader" },
  { id: 40, src: "/images/gallery/p5.jpg.jpeg", title: "Intercessor", chapter: "Rwanda", year: "2014", category: "Community", desc: "Prayer intercessor in focus" },
  { id: 41, src: "/images/gallery/p6.jpg.jpeg", title: "Drum Corps", chapter: "Tanzania", year: "2023", category: "Behind the Scenes", desc: "Percussion section" },
  { id: 42, src: "/images/gallery/p7.jpg.jpeg", title: "Guitar Ministry", chapter: "Nairobi", year: "2023", category: "Behind the Scenes", desc: "Electric guitar worship" },
  { id: 43, src: "/images/gallery/p8.jpg.jpeg", title: "Bass Line", chapter: "Nairobi", year: "2022", category: "Behind the Scenes", desc: "Bass guitar ministry" },
  { id: 44, src: "/images/gallery/p9.jpg.jpeg", title: "Strings", chapter: "Nakuru", year: "2022", category: "Behind the Scenes", desc: "String instrument ministry" },
  { id: 45, src: "/images/gallery/p10.jpg.jpeg", title: "Spoken Word", chapter: "Nairobi", year: "2023", category: "Community", desc: "Prophetic declaration" },
  { id: 46, src: "/images/gallery/p11.jpg.jpeg", title: "Sound Engineer", chapter: "Nairobi", year: "2024", category: "Behind the Scenes", desc: "Front-of-house engineer" },
  { id: 47, src: "/images/gallery/p12.jpg.jpeg", title: "Media Team", chapter: "Nairobi", year: "2024", category: "Behind the Scenes", desc: "Camera crew during live event" },
  { id: 48, src: "/images/gallery/p13.jpg.jpeg", title: "Worship in Unity", chapter: "Nairobi", year: "2024", category: "Worship", desc: "Mixed congregation, unified sound" },
  { id: 49, src: "/images/gallery/p14.jpg.jpeg", title: "Youth Voice", chapter: "Mombasa", year: "2022", category: "Community", desc: "Youth worship representative" },
  { id: 50, src: "/images/gallery/p15.jpg.jpeg", title: "Morning Glory", chapter: "Rwanda", year: "2019", category: "Worship", desc: "Dawn worship session" },
  { id: 51, src: "/images/gallery/p16.jpg.jpeg", title: "The Conductor", chapter: "Nairobi", year: "2023", category: "Community", desc: "Choir director leading" },
  { id: 52, src: "/images/gallery/p17.jpg.jpeg", title: "Faithful", chapter: "Tanzania", year: "2023", category: "Community", desc: "Long-time member spotlight" },
  { id: 53, src: "/images/gallery/p18.jpg.jpeg", title: "Creative Arts", chapter: "Nairobi", year: "2022", category: "Community", desc: "Dance ministry team" },
  { id: 54, src: "/images/gallery/p19.jpg.jpeg", title: "The Usher", chapter: "Nakuru", year: "2022", category: "Community", desc: "Volunteer usher team" },
  { id: 55, src: "/images/gallery/p20.jpg.jpeg", title: "Closing Prayer", chapter: "Nairobi", year: "2024", category: "Worship", desc: "Final corporate prayer of the night" },

  // ── misc ──
  { id: 56, src: "/images/gallery/G2LyhBZXwAE-feP.jpg", title: "Social Media Reach", chapter: "Nairobi", year: "2024", category: "Gatherings", desc: "Viral worship moment, 2024", wide: true },
  { id: 57, src: "/images/gallery/hq720.jpg", title: "YouTube Thumbnail", chapter: "Nairobi", year: "2024", category: "Archive", desc: "AFLEWO official YouTube channel preview" },
];

const FILTERS = ["All", "Gatherings", "Worship", "Community", "Behind the Scenes", "Archive"];
const CHAPTERS = ["All Chapters", "Nairobi", "Mombasa", "Tanzania", "Rwanda", "Nakuru"];

const YOUTUBE_VIDEOS = [
  {
    id: "uY1o6cJHcRc",
    title: "AFLEWO Nairobi 2025",
    desc: "Grace for Wholeness - Winners Chapel International",
    chapter: "Nairobi",
    year: "2025",
    url: "https://www.youtube.com/live/uY1o6cJHcRc?si=UGZJ3u37sK9qKaEv",
  },
  {
    id: "m2psjRxxi24",
    title: "AFLEWO Eldoret 2025",
    desc: "Rift Valley worship night, live from Eldoret",
    chapter: "Eldoret",
    year: "2025",
    url: "https://www.youtube.com/live/m2psjRxxi24?si=oRu4hbo0rXYtyYgs",
  },
  {
    id: "JVh8FwFG21k",
    title: "AFLEWO 2021 Night 1",
    desc: "Night of Wholeness - a landmark AFLEWO gathering",
    chapter: "Nairobi",
    year: "2021",
    url: "https://youtu.be/JVh8FwFG21k?si=C5D9qKWN8sMwmOFy",
  },
];

const getWatermarkedUrl = (srcPath: string) => {
  if (srcPath.startsWith("http://") || srcPath.startsWith("https://")) {
    return srcPath;
  }
  return `/api/media?src=${encodeURIComponent(srcPath)}`;
};

// ─── Lightbox Component with iOS Motion & Swipe Navigation ─────────────────
function Lightbox({
  item,
  currentIndex,
  totalCount,
  onClose,
  onPrev,
  onNext,
}: {
  item: GalleryItem | null;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [item, onClose, onPrev, onNext]);

  if (!item) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      onNext();
    } else if (distance < -minSwipeDistance) {
      onPrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center select-none"
        onClick={onClose}
      >
        {/* Deep iOS Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/95 backdrop-blur-3xl"
        />

        {/* Pure Bare Left Chevron Navigation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-3 md:left-8 z-30 p-2 text-white/50 hover:text-white active:scale-90 transition-all opacity-80 hover:opacity-100 group"
          aria-label="Previous Media"
        >
          <svg
            className="w-8 h-8 md:w-10 md:h-10 stroke-current transition-transform group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Pure Bare Right Chevron Navigation */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-3 md:right-8 z-30 p-2 text-white/50 hover:text-white active:scale-90 transition-all opacity-80 hover:opacity-100 group"
          aria-label="Next Media"
        >
          <svg
            className="w-8 h-8 md:w-10 md:h-10 stroke-current transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Main Content Modal Frame */}
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-5xl mx-4 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-gold text-[10px] font-black uppercase tracking-[0.3em]">
                  {item.chapter} · {item.year} · {item.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-black text-white/80 uppercase tracking-widest backdrop-blur-md">
                  {currentIndex + 1} / {totalCount}
                </span>
              </div>
              <h3 className="text-xl md:text-3xl font-black text-white leading-tight">{item.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all shrink-0 ml-4 border border-white/15 backdrop-blur-xl"
              aria-label="Close Preview"
            >
              <SvgIcon name="close" size={20} className="opacity-90" />
            </button>
          </div>

          {/* Protected Canvas Container */}
          <div
            className="no-download-wrapper relative w-full rounded-3xl overflow-hidden bg-white/5 border border-white/10 select-none shadow-2xl"
            style={{ height: "68vh", maxHeight: "68vh" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ProtectedCanvas
              src={getWatermarkedUrl(item.src)}
              alt={item.title}
              objectFit="contain"
              watermarkSrc="/logo.png"
              className="w-full h-full"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-1">
            <p className="text-white/60 text-sm font-medium leading-relaxed">{item.desc}</p>
            <p className="text-white/30 text-[9px] font-black uppercase tracking-widest shrink-0 ml-4">
              Swipe or use Arrow Keys
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MediaPage() {
  const [dbItems, setDbItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [chapterFilter, setChapterFilter] = useState("All Chapters");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGallery() {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const formatted: GalleryItem[] = data.map((item: any) => ({
          id: item.id,
          src: item.image_url,
          title: item.title,
          chapter: item.chapter,
          year: item.year.toString(),
          category: item.category,
          desc: item.description || "",
          wide: item.is_wide
        }));
        setDbItems(formatted);
      }
      setLoading(false);
    }
    fetchGallery();
  }, []);

  // Use DB items when loaded, fall back to local gallery - prevents double-render
  // when DB contains the same images as the local catalog.
  const gallery = dbItems.length > 0 ? dbItems : localGallery;

  const filtered = gallery.filter((item) => {
    const catOk = categoryFilter === "All" || item.category === categoryFilter;
    const chapOk = chapterFilter === "All Chapters" || item.chapter === chapterFilter;
    return catOk && chapOk;
  });

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const handlePrevItem = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null || filtered.length === 0) return null;
      return prev === 0 ? filtered.length - 1 : prev - 1;
    });
  }, [filtered.length]);

  const handleNextItem = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null || filtered.length === 0) return null;
      return prev === filtered.length - 1 ? 0 : prev + 1;
    });
  }, [filtered.length]);

  const lightboxItem = lightboxIndex !== null ? filtered[lightboxIndex] ?? null : null;

  return (
    <main className="bg-background min-h-screen">
      <Lightbox
        item={lightboxItem}
        currentIndex={lightboxIndex ?? 0}
        totalCount={filtered.length}
        onClose={closeLightbox}
        onPrev={handlePrevItem}
        onNext={handleNextItem}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section ref={topRef} className="pt-36 pb-12 px-6 border-b border-white/5">
        <div className="max-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-3">
              <span className="text-gold font-black uppercase tracking-[0.4em] text-[10px]">
                Visual Archive
              </span>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85]">
                GALLERY<br />
                <span className="text-gold">& MEDIA.</span>
              </h1>
              <p className="text-foreground/40 max-w-md font-bold text-xs uppercase tracking-widest leading-relaxed">
                20 years of worship across Africa - documented.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {[
                { label: "Images", value: `${gallery.length}` },
                { label: "Chapters", value: "5" },
                { label: "Years", value: "20+" },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4 rounded-xl text-center">
                  <p className="text-2xl font-black text-gold">{s.value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filters + View Toggle */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Category filter */}
            <div className="flex overflow-x-auto hide-scrollbar gap-1.5 glass-card p-1.5 rounded-full">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setCategoryFilter(f)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryFilter === f
                    ? "bg-gold text-brown"
                    : "text-white/40 hover:text-white"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Chapter filter */}
            <div className="flex overflow-x-auto hide-scrollbar gap-1.5 glass-card p-1.5 rounded-full">
              {CHAPTERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChapterFilter(c)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${chapterFilter === c
                    ? "bg-white/20 text-white"
                    : "text-white/30 hover:text-white"
                    }`}
                >
                  {c === "All Chapters" ? "All" : c}
                </button>
              ))}
            </div>

            {/* Grid / List view toggle */}
            <div className="ml-auto flex items-center gap-1 glass-card p-1 rounded-full shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-2.5 rounded-full transition-all ${viewMode === "grid" ? "bg-gold text-brown" : "text-white/30 hover:text-white"
                  }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="6" height="6" rx="1" />
                  <rect x="10" y="0" width="6" height="6" rx="1" />
                  <rect x="0" y="10" width="6" height="6" rx="1" />
                  <rect x="10" y="10" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={`p-2.5 rounded-full transition-all ${viewMode === "list" ? "bg-gold text-brown" : "text-white/30 hover:text-white"
                  }`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="16" height="3" rx="1" />
                  <rect x="0" y="6" width="16" height="3" rx="1" />
                  <rect x="0" y="12" width="16" height="3" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Result count */}
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/20">
            Showing {filtered.length} of {gallery.length} items
          </p>
        </div>
      </section>

      {/* ── Live Recordings ─────────────────────────────────── */}
      <section className="px-6 pt-10 pb-2">
        <div className="max-container">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gold/60 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-[8px] font-black uppercase tracking-widest">
                  <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>
                  External
                </span>
                Live Recordings
              </span>
              <h2 className="text-2xl font-black tracking-tighter">WORSHIP <span className="text-gold">ON DEMAND</span></h2>
            </div>
            <a
              href="https://youtube.com/@aflewoke"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/30 hover:text-white/70 transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              Full Channel <SvgIcon name="arrow_forward" size={12} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {YOUTUBE_VIDEOS.map((video) => (
              <div
                key={video.id}
                className="group glass-card rounded-2xl overflow-hidden border-white/5 hover:border-gold/20 transition-all duration-500 flex flex-col"
                style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
              >
                {/* Embed */}
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&color=white`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 w-full h-full"
                    style={{ border: "none" }}
                  />
                </div>
                {/* Meta */}
                <div className="px-5 py-4 flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-gold/70 px-2 py-0.5 rounded-full border border-gold/15 bg-gold/5">{video.chapter}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/25">{video.year}</span>
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight mt-0.5 leading-tight">{video.title}</h3>
                  <p className="text-white/35 text-[10px] font-medium leading-snug">{video.desc}</p>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto pt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/25 hover:text-gold/70 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 -7 48 48" fill="currentColor"><g transform="translate(-200.000000, -368.000000)"><path d="M219.044,391.269916 L219.0425,377.687742 L232.0115,384.502244 L219.044,391.269916 Z M247.52,375.334163 C247.52,375.334163 247.0505,372.003199 245.612,370.536366 C243.7865,368.610299 241.7405,368.601235 240.803,368.489448 C234.086,368 224.0105,368 224.0105,368 L223.9895,368 C223.9895,368 213.914,368 207.197,368.489448 C206.258,368.601235 204.2135,368.610299 202.3865,370.536366 C200.948,372.003199 200.48,375.334163 200.48,375.334163 C200.48,375.334163 200,379.246723 200,383.157773 L200,386.82561 C200,390.73817 200.48,394.64922 200.48,394.64922 C200.48,394.64922 200.948,397.980184 202.3865,399.447016 C204.2135,401.373084 206.612,401.312658 207.68,401.513574 C211.52,401.885191 224,402 224,402 C224,402 234.086,401.984894 240.803,401.495446 C241.7405,401.382148 243.7865,401.373084 245.612,399.447016 C247.0505,397.980184 247.52,394.64922 247.52,394.64922 C247.52,394.64922 248,390.73817 248,386.82561 L248,383.157773 C248,379.246723 247.52,375.334163 247.52,375.334163 L247.52,375.334163 Z" /></g></svg>
                    Watch on YouTube
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <section className="px-6 py-10">
        <div className="max-container">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <SvgIcon name="spinner" size={48} className="text-white/20 animate-spin opacity-50" />
              <p className="text-white/40 font-black uppercase tracking-widest text-sm">
                Loading Gallery...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <SvgIcon name="image_off" size={48} className="text-white/20 mx-auto opacity-30" />
              <p className="text-white/40 font-black uppercase tracking-widest text-sm">
                No media found for this filter
              </p>
            </div>
          ) : viewMode === "list" ? (
            /* ── List / Detail view ── */
            <div className="flex flex-col gap-3">
              {filtered.map((item, index) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-5 glass-card rounded-xl px-5 py-4 border border-white/5 hover:border-gold/30 transition-all duration-300 cursor-pointer no-download-wrapper"
                  onClick={() => openLightbox(index)}
                  onContextMenu={(e) => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${item.title}`}
                  onKeyDown={(e) => e.key === "Enter" && openLightbox(index)}
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <ProtectedCanvas
                      src={getWatermarkedUrl(item.src)}
                      alt={item.title}
                      objectFit="cover"
                      watermarkSrc="/logo.png"
                      className="w-full h-full rounded-xl"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gold text-[9px] font-black uppercase tracking-widest">{item.chapter} · {item.year}</p>
                    <h3 className="text-white text-sm font-black leading-tight truncate group-hover:text-gold transition-colors">{item.title}</h3>
                    <p className="text-white/30 text-xs font-medium truncate mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-white/40 shrink-0">{item.category}</span>
                  <SvgIcon name="open_in_full" size={14} className="text-white/20 group-hover:text-gold transition-colors shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            /* ── Masonry grid view ── */
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
              {filtered.map((item, index) => (
                <div
                  key={item.id}
                  className={`break-inside-avoid mb-4 group relative rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-gold/30 transition-all duration-500 bg-white/3 no-download-wrapper ${item.wide ? "sm:col-span-2" : ""
                    }`}
                  onClick={() => openLightbox(index)}
                  onContextMenu={(e) => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${item.title}`}
                  onKeyDown={(e) => e.key === "Enter" && openLightbox(index)}
                >
                  <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden">
                    <ProtectedCanvas
                      src={getWatermarkedUrl(item.src)}
                      alt={item.title}
                      objectFit="cover"
                      watermarkSrc="/logo.png"
                      className="w-full h-full group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30">
                    <p className="text-gold text-[9px] font-black uppercase tracking-widest">
                      {item.chapter} · {item.year}
                    </p>
                    <h3 className="text-white text-sm font-black mt-0.5 leading-tight">
                      {item.title}
                    </h3>
                  </div>

                  {/* Category badge */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-sm text-white/70 px-2.5 py-1 rounded-full border border-white/10">
                      {item.category}
                    </span>
                  </div>

                  {/* Expand icon */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-30">
                    <div className="p-2 bg-black/60 backdrop-blur-sm rounded-xl text-white/60">
                      <SvgIcon name="open_in_full" size={14} className="opacity-60" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── YouTube CTA ──────────────────────────────────────── */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-container">
          <div className="glass-card-elevated p-10 md:p-14 rounded-2xl border-gold/10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-3 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
                  <SvgIcon name="play_arrow" size={22} className="opacity-90" />
                </div>
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">
                  Full-length recordings
                </span>
              </div>
              <h3 className="text-3xl md:text-5xl font-black tracking-tighter">
                WATCH ON <span className="text-gold">YOUTUBE</span>
              </h3>
              <p className="text-white/40 max-w-md font-bold text-xs uppercase tracking-widest leading-relaxed">
                Full worship recordings, documentaries, and live streams from every AFLEWO gathering.
              </p>
            </div>
            <a
              href="https://youtube.com/@aflewoke"
              target="_blank"
              rel="noopener noreferrer"
              className="press-scale flex items-center gap-3 px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0"
            >
              <SvgIcon name="smart_display" size={20} className="opacity-90" />
              Open YouTube Channel
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
