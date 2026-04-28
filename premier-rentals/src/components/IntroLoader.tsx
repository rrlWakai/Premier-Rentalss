import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type IntroLoaderProps = {
  shouldClose: boolean;
  onComplete: () => void;
};

const logos = [
  {
    key: "patio",
    src: "/images/branding/premier-patio-logo.png",
    alt: "Premier Patio",
  },
  {
    key: "pool-house",
    src: "/images/branding/premier-pool-house-logo.jpg",
    alt: "Premier Pool House",
  },
];

export default function IntroLoader({
  shouldClose,
  onComplete,
}: IntroLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [activeLogo, setActiveLogo] = useState(0);
  const [minSequenceDone, setMinSequenceDone] = useState(false);

  useEffect(() => {
    const logoSwapTimer = window.setTimeout(() => setActiveLogo(1), 1700);
    const minSequenceTimer = window.setTimeout(
      () => setMinSequenceDone(true),
      3600,
    );

    return () => {
      window.clearTimeout(logoSwapTimer);
      window.clearTimeout(minSequenceTimer);
    };
  }, []);

  useEffect(() => {
    if (!shouldClose || !minSequenceDone) return;
    setIsVisible(false);
  }, [shouldClose, minSequenceDone]);

  const progressAnimation = useMemo(
    () => ({
      scaleX: [0, 0.3, 0.55, 0.8, 0.94],
      opacity: [0.5, 0.75, 0.65, 0.75, 0.8],
    }),
    [],
  );

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
          }}
        >
          <div className="relative flex w-full max-w-[34rem] flex-col items-center px-8">
            <div className="relative flex h-[12rem] w-full items-center justify-center sm:h-[14rem]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={logos[activeLogo].key}
                  src={logos[activeLogo].src}
                  alt={logos[activeLogo].alt}
                  className="absolute w-[13.5rem] max-w-full object-contain sm:w-[16rem]"
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.02, y: -8 }}
                  transition={{ duration: 0.95, ease: [0.32, 0.72, 0, 1] }}
                />
              </AnimatePresence>
            </div>

            <div className="mt-8 h-[2px] w-full max-w-[220px] overflow-hidden rounded-full bg-[#d7d0c2]/60">
              <motion.div
                className="h-full origin-left rounded-full bg-[#c9a96e]"
                animate={progressAnimation}
                transition={{ duration: 2.8, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
