import { useEffect, useState } from 'react';
import { readExif, type ExifInfo } from '../utils/exifReader';

const cache = new Map<string, Promise<ExifInfo | null>>();

function getExif(src: string): Promise<ExifInfo | null> {
  let pending = cache.get(src);
  if (!pending) {
    pending = readExif(src).catch(() => null);
    cache.set(src, pending);
  }
  return pending;
}

export interface UseExifResult {
  info: ExifInfo | null;
  loading: boolean;
  error: string | null;
}

export function useExif(src: string): UseExifResult {
  const [state, setState] = useState<UseExifResult>({
    info: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!src) {
      setState({ info: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ info: null, loading: true, error: null });
    getExif(src)
      .then((info) => {
        if (cancelled) return;
        setState({ info, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          info: null,
          loading: false,
          error: err instanceof Error ? err.message : 'EXIF read failed',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}
