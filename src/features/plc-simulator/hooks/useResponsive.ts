import { useState, useEffect } from 'react';

export type Platform = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveState {
  platform: Platform;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isTouch: boolean;
}

const DESKTOP_BREAKPOINT = 1024;
const TABLET_BREAKPOINT = 640;

function detectPlatform(width: number): Platform {
  if (width >= DESKTOP_BREAKPOINT) return 'desktop';
  if (width >= TABLET_BREAKPOINT) return 'tablet';
  return 'mobile';
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Responsive platform detection hook. Uses Tailwind-aligned breakpoints:
 * - desktop: ≥ 1024px (lg)
 * - tablet: 640px–1023px (sm to md)
 * - mobile: < 640px
 *
 * Also reports whether the primary input is touch-based, so the editor can
 * switch from drag-and-drop to tap-to-place interactions.
 */
export function useResponsive(): ResponsiveState {
  const [platform, setPlatform] = useState<Platform>(() =>
    typeof window === 'undefined' ? 'desktop' : detectPlatform(window.innerWidth)
  );
  const [isTouch, setIsTouch] = useState<boolean>(() => detectTouch());

  useEffect(() => {
    function handleResize() {
      setPlatform(detectPlatform(window.innerWidth));
    }
    function handleTouch() {
      setIsTouch(detectTouch());
    }
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointerdown', handleTouch, { once: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handleTouch);
    };
  }, []);

  return {
    platform,
    isDesktop: platform === 'desktop',
    isTablet: platform === 'tablet',
    isMobile: platform === 'mobile',
    isTouch,
  };
}
