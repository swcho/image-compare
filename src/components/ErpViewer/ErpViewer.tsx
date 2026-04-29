import { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { fetchToBlob } from '../../utils/fetchImage';
import { useTranslation } from '../../i18n';

interface ErpViewerProps {
  src: string;
}

export function ErpViewer({ src }: ErpViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let viewer: Viewer | null = null;
    let blobUrl: string | null = null;

    setError(null);

    fetchToBlob(src)
      .then((blob) => {
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);

        viewer = new Viewer({
          container,
          panorama: blobUrl,
          loadingTxt: t.erp.loading,
          navbar: ['zoom', 'move', 'fullscreen'],
          defaultZoomLvl: 0,
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
          keyboard: 'always',
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t.erp.fetchError);
      });

    return () => {
      cancelled = true;
      if (viewer) {
        try {
          viewer.destroy();
        } catch {
          /* ignore */
        }
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, t.erp.loading, t.erp.fetchError]);

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={containerRef} className="w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 px-4 text-center pointer-events-none">
          {error}
        </div>
      )}
    </div>
  );
}
