import { useRef } from "react";
import { motion } from "framer-motion";

interface VideoSplashProps {
  onComplete: () => void;
}

export default function VideoSplash({ onComplete }: VideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // In Vite, files in the `public` folder are referenced from the root `/`
  const videoUrl = "/loading.mp4";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      // Use 100dvh for better mobile responsiveness with dynamic browser toolbars
      className="fixed inset-0 z-[100] h-[100dvh] w-screen flex items-center justify-center bg-black overflow-hidden"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        className="absolute inset-0 h-full w-full object-contain opacity-80 pointer-events-none"
      />

      {/* Skip Button Container */}
      <div className="absolute inset-x-0 bottom-8 sm:bottom-12 flex justify-center px-4 z-10 safe-area-bottom">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.8 }}
          onClick={onComplete}
          className="text-white/70 hover:text-white uppercase tracking-[0.2em] text-[10px] sm:text-xs font-light transition-all px-6 py-3 sm:px-8 sm:py-3 border border-white/20 hover:border-white/50 rounded-full hover:bg-white/10 backdrop-blur-sm"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          Skip Intro
        </motion.button>
      </div>
    </motion.div>
  );
}
