'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Reusable <AnimatedSection /> wrapper for the Dynamic Depth Scroll Effect.
 * Scales from 0.9 -> 1.0 on viewport entrance and up to 1.05 on exit for
 * a dynamic depth sensation, fully respecting reduced-motion user preferences.
 */
export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className = '',
  id,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Dynamic Depth: 0.9 (entering) -> 1.0 (centered) -> 1.03 (exiting)
  const scale = useTransform(
    scrollYProgress,
    [0, 0.25, 0.75, 1],
    shouldReduceMotion ? [1, 1, 1, 1] : [0.92, 1, 1, 1.03]
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.85, 1],
    shouldReduceMotion ? [1, 1, 1, 1] : [0.6, 1, 1, 0.8]
  );

  return (
    <motion.section
      id={id}
      ref={ref}
      style={{
        scale,
        opacity,
      }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.section>
  );
};
