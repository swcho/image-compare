import { useEffect } from 'react';
import { useImageStore } from '../store/imageStore';

export function useKeyboard() {
  const { isOpen, viewMode, next, prev, close, backToCarousel } = useImageStore();

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      // Don't steal events from input fields on the host page
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
          if (viewMode === 'carousel') {
            e.preventDefault();
            next();
          }
          break;
        case 'ArrowLeft':
          if (viewMode === 'carousel') {
            e.preventDefault();
            prev();
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (viewMode === 'compare') {
            backToCarousel();
          } else {
            close();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [isOpen, viewMode, next, prev, close, backToCarousel]);
}
