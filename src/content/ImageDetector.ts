import { useImageStore } from '../store/imageStore';
import { isGitHubIssuePage, filenameFromUrl } from '../utils/githubDetector';
import type { IssueImage } from '../types';

const SELECTORS = [
  '.markdown-body img',
  '.comment-body img',
  '[data-testid="comment-body"] img',
  '.js-comment-body img',
].join(', ');

function collectImages(): IssueImage[] {
  const seen = new Set<string>();
  const result: IssueImage[] = [];

  document.querySelectorAll<HTMLImageElement>(SELECTORS).forEach((el) => {
    const src = el.src || el.dataset.src || '';
    if (!src || seen.has(src)) return;
    // Skip tiny icons / avatars (< 24px)
    if (el.naturalWidth > 0 && el.naturalWidth < 24) return;
    seen.add(src);
    result.push({
      src,
      alt: el.alt ?? '',
      filename: filenameFromUrl(src),
      element: el,
    });
  });

  return result;
}

export class ImageDetector {
  private observer: MutationObserver | null = null;
  private handlers = new Map<HTMLImageElement, () => void>();

  start() {
    if (!isGitHubIssuePage()) return;

    this.refresh();

    this.observer = new MutationObserver(() => this.refresh());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  stop() {
    this.observer?.disconnect();
    this.handlers.forEach((handler, el) => el.removeEventListener('click', handler));
    this.handlers.clear();
  }

  private refresh() {
    const images = collectImages();
    useImageStore.getState().setImages(images);
    this.attachClickHandlers(images);
  }

  private attachClickHandlers(images: IssueImage[]) {
    // Detach stale handlers
    this.handlers.forEach((handler, el) => {
      if (!images.some((img) => img.element === el)) {
        el.removeEventListener('click', handler);
        this.handlers.delete(el);
      }
    });

    // Attach new handlers
    images.forEach((img, index) => {
      if (this.handlers.has(img.element)) return;

      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        useImageStore.getState().openAt(index);
      };

      img.element.style.cursor = 'zoom-in';
      img.element.addEventListener('click', handler);
      this.handlers.set(img.element, handler);
    });
  }
}
