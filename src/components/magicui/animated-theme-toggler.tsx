"use client";

import { Moon, SunDim, Maximize, Minimize } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type props = {
  className?: string;
};

export const AnimatedThemeToggler = ({ className }: props) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const fullscreenRef = useRef<HTMLButtonElement | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check fullscreen state
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const changeTheme = async () => {
    if (!buttonRef.current) return;

    const newTheme = theme === "dark" ? "light" : "dark";

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button ref={buttonRef} className={cn(className)}>
          <Moon />
        </button>
        <button ref={fullscreenRef} onClick={toggleFullscreen} className={cn(className)}>
          {isFullscreen ? <Minimize /> : <Maximize />}
        </button>
      </div>
    );
  }

  const isDarkMode = theme === "dark";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button ref={buttonRef} onClick={changeTheme} className={cn(className)}>
        {isDarkMode ? <SunDim /> : <Moon />}
      </button>
      <button ref={fullscreenRef} onClick={toggleFullscreen} className={cn(className)}>
        {isFullscreen ? <Minimize /> : <Maximize />}
      </button>
    </div>
  );
};
