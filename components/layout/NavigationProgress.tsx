"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Thin top progress bar on route change — shell stays mounted; this signals navigation.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    clearTimers();
    setVisible(true);
    setProgress(12);

    timers.current.push(
      setTimeout(() => setProgress(55), 40),
      setTimeout(() => setProgress(82), 120),
      setTimeout(() => {
        setProgress(100);
        timers.current.push(
          setTimeout(() => {
            setVisible(false);
            setProgress(0);
          }, 120),
        );
      }, 220),
    );

    return clearTimers;
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[110] h-0.5 pointer-events-none"
      role="progressbar"
      aria-hidden
    >
      <div
        className={cn(
          "h-full bg-brand-500 shadow-[0_0_8px_rgba(217,106,16,0.45)] transition-[width] duration-200 ease-out",
          progress >= 100 && "opacity-0 transition-opacity duration-200",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
