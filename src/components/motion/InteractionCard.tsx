'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface InteractionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  elevation?: 'normal' | 'high';
}

/**
 * Reusable <InteractionCard /> component with 'Elevated 3D' Hover Interaction.
 * Pops out towards the user (scale: 1.03, y: -10px, deep soft shadow) and
 * settles back with Spring physics (stiffness: 300, damping: 20).
 */
export const InteractionCard: React.FC<InteractionCardProps> = ({
  children,
  className = '',
  onClick,
  elevation = 'normal',
  ...rest
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      onClick={onClick}
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              scale: 1.025,
              y: -8,
              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
              transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
              },
            }
      }
      whileTap={
        shouldReduceMotion
          ? {}
          : {
              scale: 0.98,
              y: -2,
              transition: { duration: 0.1 },
            }
      }
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className={`rounded-2xl border transition-colors ${className}`}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  );
};
