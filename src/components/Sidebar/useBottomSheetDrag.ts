"use client";

import { useRef, useState, useCallback } from 'react';

const TOGGLE_THRESHOLD_PX = 60;

type SheetState = 'minimized' | 'half' | 'full';

interface UseBottomSheetDragOptions {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
}

interface BottomSheetDragHandlers {
  dragY: number;
  isDragging: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useBottomSheetDrag({ state, onStateChange }: UseBottomSheetDragOptions): BottomSheetDragHandlers {
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
    
    // Prevent dragging up from full or down from minimized if it's already there
    // But allow some "resistance" or just allow it and let snap handle it
    setDragY(deltaY);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    
    const absY = Math.abs(dragY);
    if (absY > TOGGLE_THRESHOLD_PX) {
      if (dragY < 0) { // Dragged UP
        if (state === 'minimized') onStateChange('half');
        else if (state === 'half') onStateChange('full');
      } else { // Dragged DOWN
        if (state === 'full') onStateChange('half');
        else if (state === 'half') onStateChange('minimized');
      }
    }

    setDragY(0);
    setIsDragging(false);
    touchStartY.current = null;
  }, [state, dragY, onStateChange]);

  return { dragY, isDragging, onTouchStart, onTouchMove, onTouchEnd };
}
