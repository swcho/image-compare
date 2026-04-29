import { useState, useEffect } from 'react';
import { useImageStore } from '../../store/imageStore';
import { computeMetrics, computeDiffHeatmap } from '../../utils/imageMetrics';
import { MetricsPanel } from './MetricsPanel';
import { ExifPanel } from '../Common/ExifPanel';
import { useTranslation } from '../../i18n';
import type { ImageMetrics } from '../../types';

type HeatmapState = 'idle' | 'loading' | 'ready';

export function Comparator() {
  const images = useImageStore((s) => s.images);
  const selectedIndices = useImageStore((s) => s.selectedIndices);
  const { backToCarousel, close } = useImageStore();
  const { t } = useTranslation();

  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [heatmapState, setHeatmapState] = useState<HeatmapState>('idle');
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const imgA = images[selectedIndices[0]];
  const imgB = images[selectedIndices[1]];

  // Compute metrics whenever the selected pair changes
  useEffect(() => {
    if (!imgA || !imgB) return;

    setMetrics(null);
    setMetricsError(null);
    setHeatmapUrl(null);
    setHeatmapState('idle');
    setShowHeatmap(false);
    setMetricsLoading(true);

    computeMetrics(imgA.src, imgB.src)
      .then(setMetrics)
      .catch((err: unknown) => {
        setMetricsError(err instanceof Error ? err.message : t.comparator.metricsError);
      })
      .finally(() => setMetricsLoading(false));
  }, [imgA?.src, imgB?.src]);

  async function handleHeatmap() {
    if (heatmapState === 'ready') {
      setShowHeatmap((v) => !v);
      return;
    }
    if (!imgA || !imgB) return;

    setHeatmapState('loading');
    try {
      const url = await computeDiffHeatmap(imgA.src, imgB.src);
      setHeatmapUrl(url);
      setHeatmapState('ready');
      setShowHeatmap(true);
    } catch {
      setHeatmapState('idle');
    }
  }

  if (!imgA || !imgB) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-start pt-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-5xl bg-[#1e1e2e] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slideDown"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
          <button
            onClick={backToCarousel}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            {t.comparator.backToCarousel}
          </button>
          <span className="text-sm text-gray-300 font-medium">{t.comparator.title}</span>
          <button
            onClick={close}
            className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
            aria-label={t.comparator.close}
          >
            ✕
          </button>
        </div>

        {/* Image panes */}
        <div className="grid grid-cols-2 divide-x divide-gray-800 bg-[#12121c]">
          <ImagePane label="A" img={imgA} />
          <ImagePane label="B" img={imgB} />
        </div>

        {/* Diff heatmap (shown below images when active) */}
        {showHeatmap && heatmapUrl && (
          <div className="flex flex-col items-center bg-[#0e0e1a] py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2">{t.comparator.heatmapTitle}</p>
            <img
              src={heatmapUrl}
              alt="Difference heatmap"
              className="max-h-48 object-contain rounded"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        )}

        {/* Metrics panel */}
        {metricsLoading && (
          <div className="py-6 text-center text-xs text-gray-500">{t.comparator.metricsLoading}</div>
        )}
        {metricsError && (
          <div className="py-4 text-center text-xs text-red-400">{metricsError}</div>
        )}
        {metrics && <MetricsPanel metrics={metrics} />}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-gray-800 bg-[#1a1a2e]">
          <button
            onClick={handleHeatmap}
            disabled={heatmapState === 'loading'}
            className="text-xs px-4 py-1.5 rounded-full border border-gray-600 text-gray-400
                       hover:border-gray-300 hover:text-gray-200 disabled:opacity-40 transition-colors"
          >
            {heatmapState === 'loading'
              ? t.comparator.calculating
              : showHeatmap
                ? t.comparator.hideHeatmap
                : t.comparator.showDiffHeatmap}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImagePane sub-component
// ---------------------------------------------------------------------------

interface ImagePaneProps {
  label: string;
  img: { src: string; alt: string; filename: string };
}

function ImagePane({ label, img }: ImagePaneProps) {
  return (
    <div className="flex flex-col items-stretch gap-2 p-4 min-h-[260px]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
          {label}
        </span>
        <span className="text-xs text-gray-500 truncate">{img.filename}</span>
      </div>
      <img
        src={img.src}
        alt={img.alt}
        className="max-h-[300px] max-w-full object-contain flex-1 self-center"
        draggable={false}
      />
      <ExifPanel src={img.src} compact />
    </div>
  );
}
