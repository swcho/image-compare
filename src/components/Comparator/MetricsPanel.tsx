import type { ImageMetrics } from '../../types';
import { useTranslation } from '../../i18n';

interface MetricCardProps {
  label: string;
  value: string;
  desc: string;
  color?: string;
}

function MetricCard({ label, value, desc, color = 'text-blue-400' }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center bg-[#12121c] rounded-lg px-3 py-2 gap-0.5">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-gray-600 text-center leading-tight">{desc}</span>
    </div>
  );
}

function qualityColor(value: number, thresholds: [number, number]): string {
  if (value >= thresholds[1]) return 'text-emerald-400';
  if (value >= thresholds[0]) return 'text-yellow-400';
  return 'text-red-400';
}

interface MetricsPanelProps {
  metrics: ImageMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const { mse, psnr, ssim, phashSimilarity, histogramCorrelation } = metrics;
  const { t } = useTranslation();

  const psnrDisplay = isFinite(psnr) ? `${psnr.toFixed(1)} dB` : '∞ dB';

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#1a1a2e] border-t border-gray-800">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
        {t.metrics.title}
      </h3>

      <div className="grid grid-cols-5 gap-2">
        <MetricCard
          label="SSIM"
          value={ssim.toFixed(4)}
          desc={t.metrics.ssimDesc}
          color={qualityColor(ssim, [0.8, 0.95])}
        />
        <MetricCard
          label="MSE"
          value={mse.toFixed(0)}
          desc={t.metrics.mseDesc}
          color={qualityColor(1 - mse / 10000, [0.6, 0.9])}
        />
        <MetricCard
          label="PSNR"
          value={psnrDisplay}
          desc={t.metrics.psnrDesc}
          color={qualityColor(Math.min(psnr / 50, 1), [0.5, 0.8])}
        />
        <MetricCard
          label="pHash"
          value={`${(phashSimilarity * 100).toFixed(1)}%`}
          desc={t.metrics.phashDesc}
          color={qualityColor(phashSimilarity, [0.8, 0.95])}
        />
        <MetricCard
          label={t.metrics.histogramLabel}
          value={histogramCorrelation.toFixed(4)}
          desc={t.metrics.histogramDesc}
          color={qualityColor(histogramCorrelation, [0.8, 0.95])}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-end text-[10px]">
        <span className="text-emerald-400">{t.metrics.high}</span>
        <span className="text-yellow-400">{t.metrics.medium}</span>
        <span className="text-red-400">{t.metrics.low}</span>
      </div>
    </div>
  );
}
