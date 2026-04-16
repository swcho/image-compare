import { useImageStore } from '../store/imageStore';
import { useKeyboard } from '../hooks/useKeyboard';
import { Carousel } from '../components/Carousel/Carousel';
import { Comparator } from '../components/Comparator/Comparator';
import { I18nProvider } from '../i18n';

function AppContent() {
  useKeyboard();

  const isOpen = useImageStore((s) => s.isOpen);
  const viewMode = useImageStore((s) => s.viewMode);

  if (!isOpen) return null;

  return (
    // pointer-events:auto re-enables interaction for the overlay area
    <div style={{ pointerEvents: 'auto' }}>
      {viewMode === 'carousel' && <Carousel />}
      {viewMode === 'compare' && <Comparator />}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
