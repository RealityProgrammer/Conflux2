import { create } from 'zustand';

interface MediaGalleryOptions {
  downloadUrlProvider?: (attachmentIndex: number) => string | Promise<string>;
}

interface MediaGalleryElement {
  id: string;
  fileName: string;
  mediaType: string;
  src: string;
}

interface MediaGalleryStoreType {
  elements: MediaGalleryElement[] | null;
  viewIndex: number;
  options?: MediaGalleryOptions;

  setElements: (elements: MediaGalleryElement[], viewIndex: number, options?: MediaGalleryOptions) => void;
  clearElements: () => void;
  previousElement: () => void;
  nextElement: () => void;
}

export const useMediaGalleryStore = create<MediaGalleryStoreType>((set) => ({
  elements: null,
  viewIndex: -1,
  options: undefined,

  setElements: (elements: MediaGalleryElement[], viewIndex: number, options?: MediaGalleryOptions) => set(() => {
    return { elements, viewIndex: Math.min(Math.max(viewIndex, 0), elements.length - 1), options };
  }),

  clearElements: () => set(() => {
    return { elements: undefined, viewIndex: -1 };
  }),

  previousElement: () => set((state) => {
    if (state.viewIndex === -1 || !state.elements || state.elements.length === 0) return {};

    return {
      viewIndex: (state.viewIndex === 0 ? state.elements.length : state.viewIndex) - 1,
    }
  }),

  nextElement: () => set((state) => {
    if (state.viewIndex === -1 || !state.elements || state.elements.length === 0) return {};

    return {
      viewIndex: (state.viewIndex + 1) % state.elements.length,
    }
  }),
}))