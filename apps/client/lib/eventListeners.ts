'use client';

import { MutableRefObject } from 'react';

// Define the interface for key states
export interface Keys {
  w: { pressed: boolean };
  a: { pressed: boolean };
  s: { pressed: boolean };
  d: { pressed: boolean };
}

/**
 * Sets up keyboard event listeners for game controls
 */
export function setupEventListeners(
  keys: Keys, 
  lastTimeRef: MutableRefObject<number>
): () => void {
  // Keyboard down events
  function handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'w': keys.w.pressed = true; break;
      case 'a': keys.a.pressed = true; break;
      case 's': keys.s.pressed = true; break;
      case 'd': keys.d.pressed = true; break;
    }
  }
  
  // Keyboard up events
  function handleKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'w': keys.w.pressed = false; break;
      case 'a': keys.a.pressed = false; break;
      case 's': keys.s.pressed = false; break;
      case 'd': keys.d.pressed = false; break;
    }
  }
  
  // Reset timer when tab becomes visible again
  function handleVisibility(): void {
    if (!document.hidden) {
      lastTimeRef.current = performance.now();
    }
  }
  
  // Add the listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  document.addEventListener('visibilitychange', handleVisibility);
  
  // Return function to remove them
  return function cleanup(): void {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

/**
 * Creates a default keys state object
 */
export function createDefaultKeysState(): Keys {
  return {
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false }
  };
}