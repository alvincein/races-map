"use client";

import { useRef, useState, useCallback } from 'react';

const TOGGLE_THRESHOLD_PX = 100;

interface UseBottomSheetDragOptions {
  isMinimized: boolean;
  onToggle: () => void;
}

interface BottomSheetDragHandlers {
  /** Pixel offset to apply to the sheet while the user is mid-drag. */
  dragY: number;
  isDragging: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Drag-handle behaviour for the mobile bottom-sheet:
 *  - drag down to minimize when expanded
 *  - drag up to expand when minimized
 *  - any drag shorter than the threshold snaps back
 */
export function useBottomSheetDrag({ isMinimized, onToggle }: UseBottomSheetDragOptions): BottomSheetDragHandlers {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (!isMinimized && deltaY > 0) setDragY(deltaY);
    else if (isMinimized && deltaY < 0) setDragY(deltaY);
  }, [isMinimized]);

  const onTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    if (!isMinimized && dragY > TOGGLE_THRESHOLD_PX) onToggle();
    else if (isMinimized && dragY < -TOGGLE_THRESHOLD_PX) onToggle();
    setDragY(0);
    setIsDragging(false);
    touchStartY.current = null;
  }, [isMinimized, dragY, onToggle]);

  return { dragY, isDragging, onTouchStart, onTouchMove, onTouchEnd };
}
