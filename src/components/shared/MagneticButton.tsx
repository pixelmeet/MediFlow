"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

function useHasFinePointer(): boolean {
  return React.useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(pointer: fine)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => (typeof window !== "undefined" ? window.matchMedia("(pointer: fine)").matches : false),
    () => false
  );
}

export interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  target?: string;
  rel?: string;
  ariaLabel?: string;
  maxOffset?: number;
}

export function MagneticButton({
  children,
  className,
  href,
  onClick,
  disabled = false,
  type = "button",
  target,
  rel,
  ariaLabel,
  maxOffset = 18,
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const hasFinePointer = useHasFinePointer();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 20, mass: 0.5 };
  const springX = useSpring(rawX, springConfig);
  const springY = useSpring(rawY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !hasFinePointer || !ref.current || disabled) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    const pullRatio = 0.35;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, deltaX * pullRatio));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, deltaY * pullRatio));

    rawX.set(clampedX);
    rawY.set(clampedY);
  };

  const handleMouseLeave = () => {
    if (shouldReduceMotion || !hasFinePointer) return;
    rawX.set(0);
    rawY.set(0);
  };

  const isMotionActive = !shouldReduceMotion && hasFinePointer;

  const motionStyle = isMotionActive
    ? {
        x: springX,
        y: springY,
      }
    : undefined;

  const commonClass = cn(
    "relative inline-flex items-center justify-center cursor-pointer select-none",
    disabled && "pointer-events-none opacity-50 cursor-not-allowed",
    className
  );

  return (
    <motion.div
      ref={ref}
      style={motionStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      {href ? (
        <Link
          href={href}
          onClick={onClick}
          target={target}
          rel={rel}
          aria-label={ariaLabel}
          className={commonClass}
        >
          {children}
        </Link>
      ) : (
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          aria-label={ariaLabel}
          className={commonClass}
        >
          {children}
        </button>
      )}
    </motion.div>
  );
}
