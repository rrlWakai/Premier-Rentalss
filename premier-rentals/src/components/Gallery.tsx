import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { containerVariant, scaleVariant } from "../lib/animations";
import { ImgWithFallback } from "../lib/useImage";
import { GALLERY_IMAGES, FALLBACK } from "../lib/images";

const images = GALLERY_IMAGES.map((img, i) => ({
  ...img,
  fallback: FALLBACK.gallery[i] ?? FALLBACK.gallery[0],
}));

const modalBackdropTransition = { duration: 0.24, ease: [0.22, 1, 0.36, 1] };
const modalPanelTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] };

function GalleryTile({
  image,
  index,
  onOpen,
  className,
  style,
}: {
  image: (typeof images)[number];
  index: number;
  onOpen: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(index)}
      className={`group relative overflow-hidden ${className ?? ""}`}
      style={style}
      variants={scaleVariant}
      custom={index}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.28 }}
      aria-label={`Open gallery image ${index + 1}`}
    >
      <ImgWithFallback
        local={image.src}
        fallback={image.fallback}
        alt={image.alt}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4 py-3">
        <span
          className="text-left text-[10px] uppercase tracking-[0.22em] text-white/75"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          Premier Rentals
        </span>
        <span
          className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          View
        </span>
      </div>
    </motion.button>
  );
}

export default function Gallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeImage = images[activeIndex];

  const openModal = (index: number) => {
    setActiveIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % images.length);
  };

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  return (
    <section id="gallery" className="bg-[#f8f4ee] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <motion.div
          className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <p className="section-label mb-3">Visual Journey</p>
            <h2
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                color: "#1a1a1a",
              }}
            >
              Life at{" "}
              <span style={{ color: "#c9a96e", fontStyle: "italic" }}>
                Premier
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => openModal(0)}
            className="inline-flex w-full items-center justify-center rounded-full border border-[#d8c8af] bg-white px-5 py-2.5 text-[10px] uppercase tracking-[0.24em] text-[#1a1a1a] transition-all duration-300 hover:border-[#c9a96e] hover:text-[#c9a96e] sm:w-auto"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Open Gallery
          </button>
        </motion.div>

        <motion.div
          className="hidden gap-2 md:grid"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "auto auto",
          }}
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <GalleryTile
            image={images[0]}
            index={0}
            onOpen={openModal}
            className="cursor-pointer"
            style={{ gridRow: "span 2", minHeight: "400px" }}
          />

          {images.slice(1).map((image, index) => (
            <GalleryTile
              key={image.src}
              image={image}
              index={index + 1}
              onOpen={openModal}
              className="aspect-[4/3] cursor-pointer"
            />
          ))}
        </motion.div>

        <div className="grid grid-cols-2 gap-2 md:hidden">
          {images.map((image, index) => (
            <motion.div
              key={image.src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className={index === 0 ? "col-span-2" : ""}
            >
              <GalleryTile
                image={image}
                index={index}
                onOpen={openModal}
                className={`rounded ${index === 0 ? "h-48 sm:h-52" : "h-32 sm:h-36"}`}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && activeImage && (
          <motion.div
            className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={modalBackdropTransition}
            onClick={closeModal}
          >
            <div className="flex min-h-screen items-end justify-center p-0 sm:items-center sm:p-6">
              <motion.div
                className="relative flex max-h-[100svh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0f0f0f] shadow-[0_25px_80px_rgba(0,0,0,0.45)] sm:max-h-[calc(100svh-3rem)] sm:rounded-[28px]"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={modalPanelTransition}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-[0.24em] text-[#c9a96e]"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      Gallery Preview
                    </p>
                    <p
                      className="mt-1 text-white"
                      style={{
                        fontFamily: "Cormorant Garamond, serif",
                        fontSize: "1.6rem",
                        fontWeight: 400,
                      }}
                    >
                      Explore the spaces
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
                    aria-label="Close gallery"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid flex-1 gap-4 overflow-y-auto p-3 sm:p-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.72fr)]">
                  <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeImage.src}
                        initial={{ opacity: 0.2, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0.2, scale: 0.985 }}
                        transition={{ duration: 0.28 }}
                      >
                        <ImgWithFallback
                          local={activeImage.src}
                          fallback={activeImage.fallback}
                          alt={activeImage.alt}
                          className="h-[38vh] w-full object-cover sm:h-[50vh] lg:h-[62vh]"
                        />
                      </motion.div>
                    </AnimatePresence>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-5 py-5 sm:px-6">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p
                            className="text-[10px] uppercase tracking-[0.24em] text-white/55"
                            style={{ fontFamily: "Jost, sans-serif" }}
                          >
                            Image {activeIndex + 1} of {images.length}
                          </p>
                          <p
                            className="mt-2 text-white"
                            style={{
                              fontFamily: "Cormorant Garamond, serif",
                              fontSize: "1.55rem",
                              fontWeight: 400,
                            }}
                          >
                            {activeImage.alt}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={showPrevious}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-sm transition-all duration-300 hover:border-white/35 hover:bg-black/55 sm:left-4 sm:h-11 sm:w-11"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={showNext}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-sm transition-all duration-300 hover:border-white/35 hover:bg-black/55 sm:right-4 sm:h-11 sm:w-11"
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="flex min-h-0 flex-col">
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 sm:max-h-[52vh]">
                      {images.map((image, index) => (
                        <button
                          key={image.src}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border transition-all duration-300 ${
                            index === activeIndex
                              ? "border-[#c9a96e] shadow-[0_0_0_1px_rgba(201,169,110,0.42)]"
                              : "border-white/10 hover:border-white/30"
                          }`}
                          aria-label={`View image ${index + 1}`}
                        >
                          <ImgWithFallback
                            local={image.src}
                            fallback={image.fallback}
                            alt={image.alt}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div
                            className={`absolute inset-0 transition-colors ${
                              index === activeIndex
                                ? "bg-transparent"
                                : "bg-black/20"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
