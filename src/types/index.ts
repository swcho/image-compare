export interface IssueImage {
  src: string;
  alt: string;
  filename: string;
  element: HTMLImageElement;
}

export interface ImageMetrics {
  mse: number;
  psnr: number;
  ssim: number;
  phashSimilarity: number;   // 0~1 (1 = identical)
  histogramCorrelation: number; // -1~1 (1 = identical distribution)
}

export type ViewMode = 'carousel' | 'compare';

export interface Settings {
  domain: string;       // GitHub Enterprise domain, e.g. "github.example.com"
  enabled: boolean;
}
