"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import AIAssistant from "@/components/AIAssistant";
import YearJoinedModal from "@/components/ui/YearJoinedModal";
import loaderJson from "../../context/lottie/Loader.json";

/**
 * ClientLayout — wraps children with the preloader animation.
 * Separated from RootLayout so RootLayout can remain a server component
 * and export Next.js metadata.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Always start as true to match the server render and prevent React hydration errors.
  // The sessionStorage check runs in a useEffect (after hydration) so the server and
  // client initial renders always agree — eliminating React error #418/#423.
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pathname = usePathname();

  // After hydration: if the preloader was already shown this session, skip it instantly.
  // This keeps AIAssistant mounted and chat state alive across client-side navigations.
  useEffect(() => {
    if (sessionStorage.getItem("aflewo_preloader_done")) {
      setLoading(false);
    }
  }, []);

  // Reset the transition overlay automatically when the pathname changes
  useEffect(() => {
    setIsTransitioning(false);
  }, [pathname]);

  return (
    <>
      {loading && <Preloader onComplete={() => { sessionStorage.setItem("aflewo_preloader_done", "1"); setLoading(false); }} />}
      <div
        className={
          loading
            ? "opacity-0 invisible h-0 overflow-hidden"
            : "opacity-100 visible transition-all duration-1000 ease-out"
        }
      >
        <Navbar />
        {children}
        {/* AI assistant — rendered globally, always accessible */}
        <AIAssistant onNavigate={() => setIsTransitioning(true)} />
        {/* Post-auth year-joined onboarding modal — self-gates on needsYearJoined */}
        <YearJoinedModal />
      </div>

      {/* Light Glassmorphic iOS-inspired Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md pointer-events-auto"
          >
            <div className="w-[150px] h-[150px]">
              <Lottie animationData={loaderJson} loop={true} autoplay={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
