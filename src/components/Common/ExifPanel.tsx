import { Fragment } from 'react';
import {
  formatDate,
  formatExposureTime,
  formatFileSize,
  formatGps,
  type ExifInfo,
} from '../../utils/exifReader';
import { useExif } from '../../hooks/useExif';
import { useTranslation } from '../../i18n';

interface ExifPanelProps {
  src: string;
  compact?: boolean;
}

const COMPACT_MIN_HEIGHT = 'min-h-[140px]';
const FULL_MIN_HEIGHT = 'min-h-[180px]';

export function ExifPanel({ src, compact = false }: ExifPanelProps) {
  const { info, loading, error } = useExif(src);
  const { t } = useTranslation();

  const minHeight = compact ? COMPACT_MIN_HEIGHT : FULL_MIN_HEIGHT;
  const wrapperClass = `text-[11px] px-2 py-1.5 bg-[#0e0e1a] rounded ${minHeight}`;

  if (loading) {
    return (
      <div className={wrapperClass}>
        <ExifSkeleton compact={compact} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${wrapperClass} flex items-center text-red-400`}>{error}</div>
    );
  }

  const rows = info ? buildRows(info, t) : [];
  if (rows.length === 0) {
    return (
      <div className={`${wrapperClass} flex items-center text-gray-500`}>{t.exif.empty}</div>
    );
  }

  return (
    <div
      className={`grid ${compact ? 'grid-cols-1 gap-y-0.5' : 'grid-cols-[auto_1fr] gap-x-3 gap-y-1'} ${wrapperClass}`}
    >
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className={compact ? 'flex justify-between gap-2' : 'contents'}
        >
          <span className="text-gray-500 uppercase tracking-wider whitespace-nowrap">
            {label}
          </span>
          <span className="text-gray-200 font-mono break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — sized to match a typical 6-8 row EXIF panel so there is no
// layout shift when the real data arrives.
// ---------------------------------------------------------------------------

const COMPACT_VALUE_WIDTHS = ['w-24', 'w-36', 'w-20', 'w-32', 'w-28', 'w-40'];
const FULL_VALUE_WIDTHS = ['w-32', 'w-48', 'w-28', 'w-40', 'w-44', 'w-36', 'w-52', 'w-32'];

function ExifSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        {COMPACT_VALUE_WIDTHS.map((valueWidth, i) => (
          <div key={i} className="flex justify-between items-center gap-3">
            <div className="h-2.5 w-16 bg-gray-700/60 rounded animate-pulse" />
            <div className={`h-2.5 ${valueWidth} bg-gray-700/60 rounded animate-pulse`} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
      {FULL_VALUE_WIDTHS.map((valueWidth, i) => (
        <Fragment key={i}>
          <div className="h-3 w-20 bg-gray-700/60 rounded animate-pulse" />
          <div className={`h-3 ${valueWidth} bg-gray-700/60 rounded animate-pulse`} />
        </Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row builder
// ---------------------------------------------------------------------------

interface Row {
  label: string;
  value: string;
}

type Translations = ReturnType<typeof useTranslation>['t'];

function buildRows(info: ExifInfo, t: Translations): Row[] {
  const rows: Row[] = [];

  const push = (label: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return;
    rows.push({ label, value: String(value) });
  };

  // Dimensions / file
  if (info.width && info.height) {
    const ratio = (info.width / info.height).toFixed(3);
    push(t.exif.dimensions, `${info.width} × ${info.height} (${ratio}:1)`);
  }
  push(t.exif.fileSize, formatFileSize(info.fileSize));
  push(t.exif.mimeType, info.mimeType);

  // Camera
  const camera = [info.make, info.model].filter(Boolean).join(' ');
  if (camera) push(t.exif.camera, camera);
  push(t.exif.lens, info.lensModel);
  push(t.exif.software, info.software);

  // Shooting
  if (info.fNumber !== undefined) push(t.exif.aperture, `f/${info.fNumber}`);
  push(t.exif.shutter, formatExposureTime(info.exposureTime));
  if (info.iso !== undefined) push(t.exif.iso, `ISO ${info.iso}`);
  if (info.focalLength !== undefined) {
    const eq =
      info.focalLengthIn35mm !== undefined && info.focalLengthIn35mm !== info.focalLength
        ? ` (${info.focalLengthIn35mm}mm eq.)`
        : '';
    push(t.exif.focalLength, `${info.focalLength}mm${eq}`);
  }

  // Date
  push(t.exif.dateTaken, formatDate(info.dateTimeOriginal));

  // GPS
  push(t.exif.gps, formatGps(info.latitude, info.longitude));
  if (info.altitude !== undefined) push(t.exif.altitude, `${info.altitude.toFixed(0)}m`);

  // Panorama / 360
  if (info.projectionType) push(t.exif.projection, info.projectionType);
  if (info.usePanoramaViewer !== undefined) {
    push(t.exif.panoramaViewer, info.usePanoramaViewer ? 'true' : 'false');
  }
  if (info.fullPanoWidthPixels && info.fullPanoHeightPixels) {
    push(
      t.exif.fullPano,
      `${info.fullPanoWidthPixels} × ${info.fullPanoHeightPixels}`,
    );
  }
  if (info.croppedAreaImageWidthPixels && info.croppedAreaImageHeightPixels) {
    push(
      t.exif.croppedArea,
      `${info.croppedAreaImageWidthPixels} × ${info.croppedAreaImageHeightPixels} @ (${info.croppedAreaLeftPixels ?? 0}, ${info.croppedAreaTopPixels ?? 0})`,
    );
  }

  return rows;
}
