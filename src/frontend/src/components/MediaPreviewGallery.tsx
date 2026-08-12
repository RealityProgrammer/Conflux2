import {Dialog} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {BsChevronLeft, BsChevronRight, BsX} from "react-icons/bs";
import {type MouseEvent, useEffect, useState} from "react";
import {useEventListener} from "usehooks-ts";

export type MediaGalleryItem = {
  source: string;
  type: string;
}

export interface MediaGalleryProps {
  open: boolean;                 // Brought this back
  onOpenChange: (open: boolean) => void; // Brought this back

  currentItem: MediaGalleryItem;

  hasPreviousItem: boolean;      // Can just be a boolean now instead of a function
  onPrevious: () => void;        // Renamed from getPreviousItem

  hasNextItem: boolean;          // Can just be a boolean
  onNext: () => void;            // Renamed from getNextItem
}

export default function MediaPreviewGallery({
                                              open,
                                              onOpenChange,
                                              currentItem,
                                              hasPreviousItem,
                                              onPrevious,
                                              hasNextItem,
                                              onNext,
                                            }: MediaGalleryProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Automatically reset zoom whenever the current item changes
  useEffect(() => {
    setIsZoomed(false);
  }, [currentItem.source]);

  const handlePrev = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (hasPreviousItem) onPrevious();
  };

  const handleNext = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (hasNextItem) onNext();
  };

  useEventListener("keydown", (e: KeyboardEvent) => {
    if (!open) return;

    if (e.key === "ArrowLeft" && hasPreviousItem) handlePrev();
    if (e.key === "ArrowRight" && hasNextItem) handleNext();
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Title className="sr-only">Media preview gallery</Dialog.Title>

        <Dialog.Overlay className="backdrop-overlay"/>

        <Dialog.Close asChild>
          <IconButton
            isLoading={false}
            theme="default"
            className="fixed top-4 right-4 z-60 rounded-full p-2 bg-red-500 size-10 cursor-pointer"
          >
            <BsX className="size-8 text-white"/>
          </IconButton>
        </Dialog.Close>

        {hasPreviousItem && (
          <IconButton
            isLoading={false}
            theme="default"
            className="fixed left-4 top-1/2 -translate-y-1/2 z-60 rounded-full p-2 bg-black/50 hover:bg-black/80 size-12 cursor-pointer pointer-events-auto flex items-center justify-center transition-colors"
            onClick={handlePrev}
          >
            <BsChevronLeft className="size-6 text-white"/>
          </IconButton>
        )}

        {hasNextItem && (
          <IconButton
            isLoading={false}
            theme="default"
            className="fixed right-4 top-1/2 -translate-y-1/2 z-60 rounded-full p-2 bg-black/50 hover:bg-black/80 size-12 cursor-pointer pointer-events-auto flex items-center justify-center transition-colors"
            onClick={handleNext}
          >
            <BsChevronRight className="size-6 text-white"/>
          </IconButton>
        )}

        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 gap-4 shadow-lg duration-200 outline-none w-auto h-[95dvh] aspect-auto overflow-auto flex flex-row items-center">
          {currentItem.type.startsWith("image") ? (
            <img
              src={currentItem.source}
              alt="Preview"
              onClick={() => setIsZoomed(!isZoomed)}
              className={`transition-all duration-200 ${isZoomed ?
                "w-auto h-auto max-w-none max-h-none cursor-zoom-out" :
                "w-auto h-auto max-w-[95vw] max-h-[95vh] object-contain cursor-zoom-in"
              }`}
            />
          ) : currentItem.type.startsWith("video") ? (
            <video
              src={currentItem.source}
              controls
              autoPlay={false}
              className="w-auto h-auto max-w-[95vw] max-h-[95vh] object-contain"
            />
          ) : currentItem.type.startsWith("audio") ? (
            <audio
              src={currentItem.source}
              controls
              autoPlay={false}
              className="w-full h-auto max-w-[95vw]"
            />
          ) : (
            <div
              className="bg-gray-800 p-10 rounded-lg flex flex-col items-center justify-center text-gray-300 w-[50vw] max-w-md h-[30vh]">
              <span className="text-lg font-medium text-center w-full px-4">Preview is not available for this type of attachment</span>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}