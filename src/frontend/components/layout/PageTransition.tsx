import React from 'react';
import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * PageTransition.tsx
 *
 * Wrapper animasi antar halaman yang terorkestrasi (Orchestrated Page Transitions).
 * The "Signature Feel" Salin Gaya.
 */

interface Props {
  children: ReactNode;
}

const variants = {
  initial: {
    opacity: 0,
    x: 40, // Masuk dari kanan
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20, // Efek spring lembut (tidak linear)
    },
  },
  exit: {
    opacity: 0,
    x: -40, // Memudar ke kiri
    scale: 0.96, // Mengecil sedikit
    transition: {
      duration: 0.25,
      ease: "easeInOut",
    },
  },
};

export default function PageTransition({ children }: Props) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ willChange: "opacity, transform" }} // GPU acceleration
      className="relative min-h-screen bg-background overflow-x-hidden"
    >
      {children}
    </motion.div>
  );
}
