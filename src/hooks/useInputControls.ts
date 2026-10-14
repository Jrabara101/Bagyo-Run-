import { useEffect, useRef } from 'react';
import { GameSettings } from '../types/game';

interface InputControlHandlers {
  onShiftLane: (direction: -1 | 1) => void;
  onJump: () => void;
  onSlide: () => void;
  onOverdrive: () => void;
  onPauseToggle: () => void;
}

export function useInputControls(
  handlers: InputControlHandlers,
  settings: GameSettings,
  isActive: boolean
) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Keyboard controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        handlers.onPauseToggle();
        return;
      }

      // Check customizable keybindings
      const key = e.key.toLowerCase();
      const code = e.code;

      if (key === settings.keyLeft.toLowerCase() || code === 'ArrowLeft') {
        handlers.onShiftLane(-1);
      } else if (key === settings.keyRight.toLowerCase() || code === 'ArrowRight') {
        handlers.onShiftLane(1);
      } else if (key === settings.keyJump.toLowerCase() || code === 'ArrowUp') {
        handlers.onJump();
      } else if (key === settings.keySlide.toLowerCase() || code === 'ArrowDown') {
        handlers.onSlide();
      } else if (key === settings.keyOverdrive.toLowerCase() || code === 'Space') {
        handlers.onOverdrive();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, settings, isActive]);

  // Touch Swipe & Tap Controls
  useEffect(() => {
    if (!isActive) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: performance.now(),
        };

        // Double tap detection for Overdrive
        const now = performance.now();
        if (now - lastTapTimeRef.current < 280) {
          handlers.onOverdrive();
          if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
        }
        lastTapTimeRef.current = now;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return;

      const touchEnd = e.changedTouches[0];
      const deltaX = touchEnd.clientX - touchStartRef.current.x;
      const deltaY = touchEnd.clientY - touchStartRef.current.y;
      const elapsed = performance.now() - touchStartRef.current.time;

      const minSwipeDistance = 30; // pixels

      if (elapsed < 400) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
          // Horizontal Swipe
          if (deltaX > 0) {
            handlers.onShiftLane(1); // Right
          } else {
            handlers.onShiftLane(-1); // Left
          }
          if (navigator.vibrate) navigator.vibrate(15);
        } else if (Math.abs(deltaY) > minSwipeDistance) {
          // Vertical Swipe
          if (deltaY < 0) {
            handlers.onJump(); // Swipe Up
          } else {
            handlers.onSlide(); // Swipe Down
          }
          if (navigator.vibrate) navigator.vibrate(15);
        }
      }

      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlers, isActive]);

  // Gamepad Polling Loop
  useEffect(() => {
    if (!isActive) return;

    let animId: number;
    let lastPadAxesX = 0;
    let lastPadAxesY = 0;
    let lastButtons: Record<number, boolean> = {};

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = gamepads[0]; // Player 1

      if (pad && pad.connected) {
        // Left stick X or D-Pad Left/Right (buttons 14, 15)
        const axisX = pad.axes[0] || 0;
        const btnLeft = pad.buttons[14]?.pressed;
        const btnRight = pad.buttons[15]?.pressed;

        if ((axisX < -0.5 && lastPadAxesX >= -0.5) || (btnLeft && !lastButtons[14])) {
          handlers.onShiftLane(-1);
        } else if ((axisX > 0.5 && lastPadAxesX <= 0.5) || (btnRight && !lastButtons[15])) {
          handlers.onShiftLane(1);
        }
        lastPadAxesX = axisX;

        // Stick Y or D-Pad Up/Down (buttons 12, 13) or Button A (0) / B (1)
        const axisY = pad.axes[1] || 0;
        const btnUp = pad.buttons[12]?.pressed;
        const btnDown = pad.buttons[13]?.pressed;
        const btnA = pad.buttons[0]?.pressed; // Jump
        const btnB = pad.buttons[1]?.pressed; // Slide
        const btnX = pad.buttons[2]?.pressed; // Overdrive

        if ((axisY < -0.5 && lastPadAxesY >= -0.5) || (btnUp && !lastButtons[12]) || (btnA && !lastButtons[0])) {
          handlers.onJump();
        } else if ((axisY > 0.5 && lastPadAxesY <= 0.5) || (btnDown && !lastButtons[13]) || (btnB && !lastButtons[1])) {
          handlers.onSlide();
        } else if (btnX && !lastButtons[2]) {
          handlers.onOverdrive();
        }
        lastPadAxesY = axisY;

        lastButtons = {
          0: !!btnA,
          1: !!btnB,
          2: !!btnX,
          12: !!btnUp,
          13: !!btnDown,
          14: !!btnLeft,
          15: !!btnRight,
        };
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [handlers, isActive]);
}
