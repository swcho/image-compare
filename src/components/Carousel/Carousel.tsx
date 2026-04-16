import { useRef, useEffect } from 'react';
import { useImageStore } from '../../store/imageStore';
import { useTranslation } from '../../i18n';

export function Carousel() {
  const images = useImageStore((s) => s.images);
  const currentIndex = useImageStore((s) => s.currentIndex);
  const compareMode = useImageStore((s) => s.compareMode);
  const selectedIndices = useImageStore((s) => s.selectedIndices);
  const { close, goTo, next, prev, toggleCompareMode, selectForCompare, startCompare } =
    useImageStore();
  const { t } = useTranslation();

  const thumbRef = useRef<HTMLDivElement>(null);
  const current = images[currentIndex];

  // Scroll active thumbnail into view
  useEffect(() => {
    const strip = thumbRef.current;
    if (!strip) return;
    const thumb = strip.children[currentIndex] as HTMLElement | undefined;
    thumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentIndex]);

  if (!current) return null;

  function handleThumbClick(index: number) {
    if (compareMode) {
      selectForCompare(index);
    } else {
      goTo(index);
    }
  }

  const canCompare = compareMode && selectedIndices.length === 2;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/85 flex flex-col items-center justify-start pt-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Panel */}
      <div
        id="gh-img-compare-panel"
        className="w-full max-w-5xl bg-[#1e1e2e] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slideDown"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700">
          <span className="text-gray-300 text-sm">
            {currentIndex + 1} / {images.length} &nbsp;·&nbsp;
            <span className="text-gray-500">{current.filename}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCompareMode}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                compareMode
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200'
              }`}
            >
              {t.carousel.compareMode}
            </button>
            {canCompare && (
              <button
                onClick={startCompare}
                className="text-xs px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {t.carousel.compare}
              </button>
            )}
            <button
              onClick={close}
              className="text-gray-500 hover:text-gray-200 transition-colors ml-1 text-lg leading-none"
              aria-label={t.carousel.close}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div
          ref={thumbRef}
          className="thumb-strip flex gap-2 px-3 py-2 bg-[#161622] overflow-x-auto"
        >
          {images.map((img, i) => {
            const isActive = i === currentIndex;
            const isSelected = selectedIndices.includes(i);
            return (
              <button
                key={img.src}
                onClick={() => handleThumbClick(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                  isActive
                    ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                    : isSelected
                      ? 'border-emerald-500'
                      : 'border-transparent hover:border-gray-500'
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {compareMode && (
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                    }`}
                  >
                    {isSelected ? `#${selectedIndices.indexOf(i) + 1}` : t.carousel.select}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Main image */}
        <div className="relative flex items-center justify-center bg-[#12121c] min-h-[360px] max-h-[60vh]">
          {/* Prev arrow */}
          <button
            onClick={prev}
            disabled={images.length <= 1}
            className="absolute left-3 z-10 w-9 h-9 flex items-center justify-center
                       rounded-full bg-black/50 text-white hover:bg-black/80
                       disabled:opacity-20 transition-colors text-lg"
            aria-label={t.carousel.prev}
          >
            ‹
          </button>

          <img
            key={current.src}
            src={current.src}
            alt={current.alt}
            className="max-h-[58vh] max-w-full object-contain select-none animate-fadeIn"
            draggable={false}
          />

          {/* Next arrow */}
          <button
            onClick={next}
            disabled={images.length <= 1}
            className="absolute right-3 z-10 w-9 h-9 flex items-center justify-center
                       rounded-full bg-black/50 text-white hover:bg-black/80
                       disabled:opacity-20 transition-colors text-lg"
            aria-label={t.carousel.next}
          >
            ›
          </button>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 text-center text-xs text-gray-600 border-t border-gray-800">
          {t.carousel.keyboardHint}
          {compareMode && (
            <span className="ml-2 text-emerald-600">{t.carousel.selectTwoImages}</span>
          )}
        </div>
      </div>
    </div>
  );
}
