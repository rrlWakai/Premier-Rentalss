import { useState } from "react";

/**
 * useImage — returns { src, onError }
 * If the local /public image fails to load (404), swaps to fallbackSrc.
 *
 * Usage:
 *   const { src, onError } = useImage('/images/hero/hero-bg.jpg', FALLBACK.heroBg)
 *   <img src={src} onError={onError} />
 */
export function useImage(localSrc: string, fallbackSrc: string) {
  const [src, setSrc] = useState(localSrc);

  function onError() {
    if (src !== fallbackSrc) {
      setSrc(fallbackSrc);
    }
  }

  return { src, onError };
}

/**
 * ImgWithFallback — drop-in <img> that auto-falls back to Unsplash
 * if the local /public image is missing.
 *
 * Usage:
 *   <ImgWithFallback
 *     local="/images/properties/premier-pool-house/cover.jpg"
 *     fallback={FALLBACK.poolHouseCover}
 *     alt="Premier Pool House"
 *     className="w-full h-full object-cover"
 *   />
 */
interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  local: string;
  fallback: string;
}

export function ImgWithFallback({
  local,
  fallback,
  alt = "",
  ...props
}: ImgProps) {
  const { src, onError } = useImage(local, fallback);
  return <img src={src} onError={onError} alt={alt} {...props} />;
}
