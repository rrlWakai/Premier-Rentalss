import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { containerVariant, scaleVariant } from "../lib/animations";
import { ImgWithFallback } from "../lib/useImage";
import { GALLERY_IMAGES, FALLBACK } from "../lib/images";

const images = GALLERY_IMAGES.map((img, i) => ({
  ...img,
  fallback: FALLBACK.gallery[i] ?? FALLBACK.gallery[0],
}));


function GalleryTile({
  image,
  index,
  onOpen,
  className,
  style,
  actionLabel = "View",
  featured = false,
}: {
  image: (typeof images)[number];
  index: number;
  onOpen: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
  actionLabel?: string;
  featured?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(index)}
      className={`group relative block w-full overflow-hidden ${className ?? ""}`}
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
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 group-hover:opacity-100 ${
          featured
            ? "bg-gradient-to-t from-black/80 via-black/25 to-black/5 opacity-100"
            : "bg-gradient-to-t from-black/55 via-black/12 to-transparent opacity-85"
        }`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-5 py-4 sm:px-6 sm:py-5">
        <div className="max-w-[70%] text-left">
          <span
            className="block text-[10px] uppercase tracking-[0.22em] text-white/70"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Premier Rentals
          </span>
          {featured ? (
            <span
              className="mt-1 block text-[0.95rem] text-white"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              View More
            </span>
          ) : null}
        </div>
        <span
          className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

export default function Gallery() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);

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
    <section id="gallery" className="bg-[#f8f4ee]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <motion.div
          className="mb-9 max-w-3xl sm:mb-10 lg:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-4 sm:space-y-5">
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
            <p
              className="max-w-2xl text-sm leading-relaxed text-[#6f6b63] sm:text-[15px]"
              style={{ fontFamily: "Jost, sans-serif", fontWeight: 300 }}
            >
              A closer look at the details, textures, and spaces that shape each
              private city stay.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="hidden gap-3 md:grid lg:gap-4"
          style={{
            gridTemplateColumns: "minmax(0,1.3fr) repeat(2,minmax(0,1fr))",
            gridTemplateRows: "repeat(2, minmax(0, 250px))",
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
            className="h-full cursor-pointer"
            style={{ gridRow: "span 2" }}
          />

          {images.slice(1).map((image, index) => {
            const isLastImage = index === images.slice(1).length - 1;

            return (
            <GalleryTile
              key={image.src}
              image={image}
              index={index + 1}
              onOpen={openModal}
              className="h-full min-h-[250px] cursor-pointer"
              actionLabel={isLastImage ? "Open" : "View"}
              featured={isLastImage}
            />
            );
          })}
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:hidden">
          {images.map((image, index) => {
            const isHeroTile = index === 0;
            const isLastImage = index === images.length - 1;

            return (
            <motion.div
              key={image.src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className={isHeroTile ? "col-span-2" : ""}
            >
              <GalleryTile
                image={image}
                index={index}
                onOpen={openModal}
                className={`${
                  isHeroTile
                    ? "h-[260px] sm:h-[310px]"
                    : "h-[185px] sm:h-[210px]"
                }`}
                actionLabel={isLastImage ? "Open" : "View"}
                featured={isLastImage}
              />
            </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[110] bg-[#050505]"
            onClick={closeModal}
          >
            <div className="flex h-[100svh] w-full flex-col">
              {/* Minimal Header */}
              <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 sm:py-6 lg:px-10">
                <div className="flex items-center gap-4">
                  <h2
                    className="text-white"
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
                      fontWeight: 300,
                      letterSpacing: "0.02em",
                    }}
                  >
                    Premier Collection
                  </h2>
                  <div className="hidden h-4 w-[1px] bg-white/20 sm:block" />
                  <span
                    className="hidden text-[10px] uppercase tracking-[0.2em] text-[#8a8a7a] sm:inline"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    Image {activeIndex + 1} of {images.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="group flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close gallery"
                >
                  <X size={20} strokeWidth={1} />
                </button>
              </div>

              {/* Minimal Content */}
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0 lg:flex-row lg:gap-6 lg:p-6 lg:pt-0">
                {/* Main Image */}
                <div
                  className="relative flex min-h-0 flex-1 items-center justify-center rounded-sm bg-black/40"
                  onTouchStart={(e) => { touchStartX.current = e.changedTouches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const diff = touchStartX.current - e.changedTouches[0].clientX;
                    if (Math.abs(diff) > 50) diff > 0 ? showNext() : showPrevious();
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImage.src}
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="h-full w-full"
                    >
                      <ImgWithFallback
                        local={activeImage.src}
                        fallback={activeImage.fallback}
                        alt={activeImage.alt}
                        className="h-full w-full object-contain"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          showPrevious();
                        }}
                        className="absolute left-2 flex h-12 w-12 items-center justify-center text-white/50 transition-all duration-300 hover:text-white opacity-100 lg:opacity-0 lg:focus:opacity-100 lg:group-hover:opacity-100 sm:left-4"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={28} strokeWidth={1} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          showNext();
                        }}
                        className="absolute right-2 flex h-12 w-12 items-center justify-center text-white/50 transition-all duration-300 hover:text-white opacity-100 lg:opacity-0 lg:focus:opacity-100 lg:group-hover:opacity-100 sm:right-4"
                        aria-label="Next image"
                      >
                        <ChevronRight size={28} strokeWidth={1} />
                      </button>
                    </>
                  )}
                  {/* Mobile Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:hidden">
                    <span
                      className="rounded-full bg-black/40 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70 backdrop-blur-md"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      {activeIndex + 1} / {images.length}
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="flex h-[15vh] min-h-[80px] shrink-0 flex-col overflow-hidden sm:h-[18vh] lg:h-full lg:w-[220px] xl:w-[260px]">
                  <div className="flex h-full gap-2 overflow-x-auto overflow-y-hidden lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                    {images.map((image, i) => (
                      <button
                        key={image.src}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveIndex(i);
                        }}
                        className={`relative shrink-0 aspect-[4/3] rounded-sm transition-all duration-500 w-[120px] sm:w-[160px] lg:w-full lg:h-auto ${
                          i === activeIndex
                            ? "opacity-100 ring-1 ring-white/50 ring-offset-2 ring-offset-[#050505]"
                            : "opacity-30 hover:opacity-100"
                        }`}
                        aria-label={`View image ${i + 1}`}
                      >
                        <ImgWithFallback
                          local={image.src}
                          fallback={image.fallback}
                          alt={image.alt}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
