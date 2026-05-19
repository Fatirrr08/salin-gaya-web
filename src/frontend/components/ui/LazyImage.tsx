import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  aspectRatio?: string;
}

export default function LazyImage({ src, alt = "", aspectRatio = "aspect-[4/5]", className = "", ...props }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`relative overflow-hidden ${aspectRatio} ${className}`} ref={imgRef}>
      {/* Shimmer Effect Fallback - Warna Cokelat Tua (#5C3A21) */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-[#5C3A21] animate-pulse flex items-center justify-center overflow-hidden z-0"
          >
            {/* Shimmer Layer */}
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" style={{ transform: "skewX(-20deg)" }} />
          </motion.div>
        )}
      </AnimatePresence>

      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          onLoad={() => setIsLoaded(true)}
          style={{ willChange: "opacity" }}
          className={`absolute inset-0 w-full h-full object-cover z-10`}
          {...props}
        />
      )}
    </div>
  );
}
