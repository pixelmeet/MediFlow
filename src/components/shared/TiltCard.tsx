"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useReducedMotion, type HTMLMotionProps } from "motion/react";
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

export interface TiltCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // degrees, default 5
  perspective?: number; // default 1000
}

export function TiltCard({
  children,
  className,
  maxTilt = 5,
  perspective = 1000,
  ...props
}: TiltCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const hasFinePointer = useHasFinePointer();

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 20, mass: 0.5 };
  const rotateX = useSpring(rawRotateX, springConfig);
  const rotateY = useSpring(rawRotateY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !hasFinePointer || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Range from -1 to 1
    const normalizedX = (mouseX / width) * 2 - 1;
    const normalizedY = (mouseY / height) * 2 - 1;

    // Tilting: moving up rotates X backwards (negative angle), moving right rotates Y forward (positive angle)
    rawRotateX.set(-normalizedY * maxTilt);
    rawRotateY.set(normalizedX * maxTilt);
  };

  const handleMouseLeave = () => {
    if (shouldReduceMotion || !hasFinePointer) return;
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  const isMotionActive = !shouldReduceMotion && hasFinePointer;

  return (
    <div
      style={{ perspective: `${perspective}px` }}
      className="h-full"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          isMotionActive
            ? {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
            : undefined
        }
        className={cn("h-full transition-shadow duration-200", className)}
        {...props}
      >
        {children}
      </motion.div>
    </div>
  );
}
