import { create } from 'zustand';
import type { IssueImage, ViewMode } from '../types';

interface ImageState {
  // image list detected on the page
  images: IssueImage[];

  // overlay visibility
  isOpen: boolean;

  // which panel is active
  viewMode: ViewMode;

  // carousel state
  currentIndex: number;
  compareMode: boolean;             // thumbnail checkbox mode
  selectedIndices: number[];        // up to 2 indices for comparison

  // actions
  setImages: (images: IssueImage[]) => void;
  openAt: (index: number) => void;
  close: () => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  toggleCompareMode: () => void;
  selectForCompare: (index: number) => void;
  startCompare: () => void;
  backToCarousel: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  images: [],
  isOpen: false,
  viewMode: 'carousel',
  currentIndex: 0,
  compareMode: false,
  selectedIndices: [],

  setImages: (images) => set({ images }),

  openAt: (index) =>
    set({
      isOpen: true,
      viewMode: 'carousel',
      currentIndex: index,
      compareMode: false,
      selectedIndices: [],
    }),

  close: () =>
    set({
      isOpen: false,
      compareMode: false,
      selectedIndices: [],
    }),

  goTo: (index) => {
    const { images } = get();
    if (index < 0 || index >= images.length) return;
    set({ currentIndex: index });
  },

  next: () => {
    const { currentIndex, images } = get();
    set({ currentIndex: (currentIndex + 1) % images.length });
  },

  prev: () => {
    const { currentIndex, images } = get();
    set({ currentIndex: (currentIndex - 1 + images.length) % images.length });
  },

  toggleCompareMode: () => {
    const { compareMode } = get();
    set({ compareMode: !compareMode, selectedIndices: [] });
  },

  selectForCompare: (index) => {
    const { selectedIndices } = get();
    if (selectedIndices.includes(index)) {
      set({ selectedIndices: selectedIndices.filter((i) => i !== index) });
    } else if (selectedIndices.length < 2) {
      set({ selectedIndices: [...selectedIndices, index] });
    } else {
      // replace the older selection
      set({ selectedIndices: [selectedIndices[1], index] });
    }
  },

  startCompare: () => {
    const { selectedIndices } = get();
    if (selectedIndices.length === 2) {
      set({ viewMode: 'compare' });
    }
  },

  backToCarousel: () => set({ viewMode: 'carousel' }),
}));
