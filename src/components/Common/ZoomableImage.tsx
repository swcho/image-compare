import { useRef, useState, useEffect, useCallback } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const WHEEL_STEP = 0.0028; // sensitivity for wheel zoom
const BUTTON_STEP = 1.4; // multiplicative step for +/- buttons

/**
 * Transform shared across synced panes. Pan (nx, ny) is normalized as a
 * fraction of the *rendered* image size, so two images of different sizes
 * pan proportionally (the same relative region stays anchored).
 */
export interface Transform {
  scale: number;
  nx: number;
  ny: number;
}

export const IDENTITY: Transform = { scale: 1, nx: 0, ny: 0 };

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

interface ZoomableImageProps {
  src: string;
  alt?: string;
  /** className applied to the <img> (use it to constrain max size) */
  imgClassName?: string;
  /** className applied to the clipping container */
  className?: string;
  /** Controlled transform (for synced compare panes). Omit for self-managed. */
  transform?: Transform;
  /** Setter for the controlled transform. Receives a (prev) => next updater. */
  onTransformChange?: (updater: (prev: Transform) => Transform) => void;
}

/**
 * Image wrapper supporting wheel zoom, pinch zoom (touch) and drag-to-pan,
 * with an overlay UI showing the current zoom level.
 *
 * Zoom is anchored on the cursor / pinch midpoint. The transform uses
 * `transform-origin: center`; pan is stored normalized to the rendered image
 * size so it can be shared between differently-sized panes.
 */
export function ZoomableImage({
  src,
  alt,
  imgClassName,
  className,
  transform,
  onTransformChange,
}: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const controlled = transform !== undefined && onTransformChange !== undefined;
  const [internalT, setInternalT] = useState<Transform>(IDENTITY);
  const t = controlled ? transform : internalT;
  const setT = controlled ? onTransformChange : setInternalT;

  // Reset self-managed transform when the source changes.
  // (In controlled mode the parent owns resets.)
  useEffect(() => {
    if (!controlled) setInternalT(IDENTITY);
  }, [src, controlled]);

  // --- geometry helpers ---------------------------------------------------
  /** Rendered image box (ignores CSS transform — offsetWidth/Height do). */
  const getSize = useCallback(() => {
    const el = imgRef.current;
    return { w: el?.offsetWidth || 1, h: el?.offsetHeight || 1 };
  }, []);

  const center = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  }, []);

  /** Zoom to `nextScale`, keeping the screen point (mx,my) anchored. */
  const zoomTo = useCallback(
    (nextScale: number, mx: number, my: number) => {
      setT((prev) => {
        const s2 = clamp(nextScale, MIN_SCALE, MAX_SCALE);
        if (s2 === prev.scale) return prev;
        if (s2 === MIN_SCALE) return IDENTITY; // snap back to a clean fit

        const { cx, cy } = center();
        const { w, h } = getSize();
        const vx = mx - cx;
        const vy = my - cy;
        const txp = prev.nx * w;
        const typ = prev.ny * h;
        const ratio = s2 / prev.scale;
        return {
          scale: s2,
          nx: (vx - ratio * (vx - txp)) / w,
          ny: (vy - ratio * (vy - typ)) / h,
        };
      });
    },
    [center, getSize, setT],
  );

  // --- wheel zoom (non-passive so we can preventDefault) ------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * WHEEL_STEP);
      setT((prev) => {
        const s2 = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE);
        if (s2 === prev.scale) return prev;
        if (s2 === MIN_SCALE) return IDENTITY;

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const { w, h } = getSize();
        const vx = e.clientX - cx;
        const vy = e.clientY - cy;
        const txp = prev.nx * w;
        const typ = prev.ny * h;
        const ratio = s2 / prev.scale;
        return {
          scale: s2,
          nx: (vx - ratio * (vx - txp)) / w,
          ny: (vy - ratio * (vy - typ)) / h,
        };
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [getSize, setT]);

  // --- drag to pan --------------------------------------------------------
  const dragRef = useRef<{ x: number; y: number; nx: number; ny: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (t.scale <= MIN_SCALE) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, nx: t.nx, ny: t.ny };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const { w, h } = getSize();
    setT((prev) => ({
      ...prev,
      nx: d.nx + (e.clientX - d.x) / w,
      ny: d.ny + (e.clientY - d.y) / h,
    }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  // --- pinch zoom (touch) -------------------------------------------------
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const touchDist = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDist(e.touches), scale: t.scale };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = touchDist(e.touches);
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomTo((pinchRef.current.scale * dist) / pinchRef.current.dist, mx, my);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  };

  // --- button / dblclick controls ----------------------------------------
  const zoomByButton = (factor: number) => {
    const { cx, cy } = center();
    zoomTo(t.scale * factor, cx, cy);
  };

  const reset = () => setT(() => IDENTITY);

  const toggleZoom = (e: React.MouseEvent) => {
    if (t.scale > MIN_SCALE) {
      reset();
    } else {
      zoomTo(2, e.clientX, e.clientY);
    }
  };

  const zoomed = t.scale > MIN_SCALE;
  const percent = Math.round(t.scale * 100);
  const { w, h } = getSize();

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-none ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDoubleClick={toggleZoom}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`select-none ${imgClassName ?? ''}`}
        draggable={false}
        style={{
          transform: `translate(${t.nx * w}px, ${t.ny * h}px) scale(${t.scale})`,
          transformOrigin: 'center',
          cursor: zoomed ? (dragRef.current ? 'grabbing' : 'grab') : 'zoom-in',
          willChange: 'transform',
        }}
      />

      {/* Zoom-level controls */}
      <div
        className="absolute bottom-2 right-2 z-20 flex items-center gap-0.5 rounded-full
                   bg-black/60 px-1 py-0.5 text-white backdrop-blur-sm select-none"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => zoomByButton(1 / BUTTON_STEP)}
          disabled={!zoomed}
          className="w-6 h-6 flex items-center justify-center rounded-full text-base
                     hover:bg-white/20 disabled:opacity-30 transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={reset}
          className="min-w-[3rem] px-1 text-center text-xs tabular-nums hover:text-blue-300 transition-colors"
          aria-label="Reset zoom"
        >
          {percent}%
        </button>
        <button
          onClick={() => zoomByButton(BUTTON_STEP)}
          disabled={t.scale >= MAX_SCALE}
          className="w-6 h-6 flex items-center justify-center rounded-full text-base
                     hover:bg-white/20 disabled:opacity-30 transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
