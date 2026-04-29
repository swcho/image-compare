import exifr from 'exifr';
import { fetchToBlob } from './fetchImage';

export interface ExifInfo {
  // File / image
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  orientation?: number;
  colorSpace?: string;

  // Camera
  make?: string;
  model?: string;
  lensModel?: string;
  software?: string;

  // Shooting parameters
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  focalLength?: number;
  focalLengthIn35mm?: number;
  flash?: string;

  // Date
  dateTimeOriginal?: Date;

  // GPS
  latitude?: number;
  longitude?: number;
  altitude?: number;

  // 360 / Panorama (Google Photo Sphere XMP)
  projectionType?: string;
  usePanoramaViewer?: boolean;
  fullPanoWidthPixels?: number;
  fullPanoHeightPixels?: number;
  croppedAreaImageWidthPixels?: number;
  croppedAreaImageHeightPixels?: number;
  croppedAreaLeftPixels?: number;
  croppedAreaTopPixels?: number;
  poseHeadingDegrees?: number;

  // Raw bag for advanced inspection
  raw: Record<string, unknown>;
}

const EXIFR_OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  xmp: true,
  jfif: true,
  ihdr: true,
  iptc: false,
  icc: false,
  interop: false,
  mergeOutput: true,
  silentErrors: true,
} as const;

export async function readExif(url: string): Promise<ExifInfo | null> {
  const blob = await fetchToBlob(url);
  const buffer = await blob.arrayBuffer();

  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = (await exifr.parse(buffer, EXIFR_OPTIONS)) as Record<string, unknown> | undefined;
  } catch {
    parsed = undefined;
  }

  // Even if EXIF parsing fails, we can still return file/dimension info via decode.
  const dims = await decodeDimensions(blob);

  if (!parsed && !dims) return null;

  const raw = parsed ?? {};
  const get = <T>(key: string): T | undefined => raw[key] as T | undefined;

  return {
    fileSize: blob.size,
    mimeType: blob.type || undefined,
    width: get<number>('ImageWidth') ?? get<number>('ExifImageWidth') ?? dims?.width,
    height: get<number>('ImageHeight') ?? get<number>('ExifImageHeight') ?? dims?.height,
    orientation: get<number>('Orientation'),
    colorSpace: get<string>('ColorSpace'),

    make: get<string>('Make'),
    model: get<string>('Model'),
    lensModel: get<string>('LensModel'),
    software: get<string>('Software'),

    fNumber: get<number>('FNumber'),
    exposureTime: get<number>('ExposureTime'),
    iso: get<number>('ISO') ?? get<number>('ISOSpeedRatings'),
    focalLength: get<number>('FocalLength'),
    focalLengthIn35mm: get<number>('FocalLengthIn35mmFormat'),
    flash: typeof raw.Flash === 'string' ? (raw.Flash as string) : undefined,

    dateTimeOriginal: get<Date>('DateTimeOriginal') ?? get<Date>('CreateDate'),

    latitude: get<number>('latitude'),
    longitude: get<number>('longitude'),
    altitude: get<number>('GPSAltitude'),

    projectionType: get<string>('ProjectionType'),
    usePanoramaViewer: get<boolean>('UsePanoramaViewer'),
    fullPanoWidthPixels: get<number>('FullPanoWidthPixels'),
    fullPanoHeightPixels: get<number>('FullPanoHeightPixels'),
    croppedAreaImageWidthPixels: get<number>('CroppedAreaImageWidthPixels'),
    croppedAreaImageHeightPixels: get<number>('CroppedAreaImageHeightPixels'),
    croppedAreaLeftPixels: get<number>('CroppedAreaLeftPixels'),
    croppedAreaTopPixels: get<number>('CroppedAreaTopPixels'),
    poseHeadingDegrees: get<number>('PoseHeadingDegrees'),

    raw,
  };
}

async function decodeDimensions(blob: Blob): Promise<{ width: number; height: number } | null> {
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function formatExposureTime(t: number | undefined): string | undefined {
  if (t === undefined || !isFinite(t)) return undefined;
  if (t >= 1) return `${t.toFixed(1)}s`;
  return `1/${Math.round(1 / t)}s`;
}

export function formatFileSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatGps(lat?: number, lon?: number): string | undefined {
  if (lat === undefined || lon === undefined) return undefined;
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export function formatDate(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  if (!(d instanceof Date) || isNaN(d.getTime())) return undefined;
  return d.toLocaleString();
}
