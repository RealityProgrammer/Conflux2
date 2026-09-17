import {Dialog} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {BsChevronLeft, BsChevronRight, BsX, BsXLg} from "react-icons/bs";
import {type MouseEvent, useRef, useState} from "react";
import {useEventListener} from "usehooks-ts";
import {FaDownload, FaXmark} from "react-icons/fa6";

const SCALE_FACTOR = 3;

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

  onDownloadRequested?: () => void;
}

export default function MediaPreviewGallery({
  open,
  onOpenChange,
  currentItem,
  hasPreviousItem,
  onPrevious,
  hasNextItem,
  onNext,
  onDownloadRequested,
}: MediaGalleryProps) {
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

  const handleDownload = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    onDownloadRequested?.();
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

        <div className="absolute top-4 right-4 z-10 flex flex-row items-center gap-4 p-2 bg-gray-600 rounded-md">
          {onDownloadRequested && (
            <IconButton
              theme="default"
              className="cursor-pointer"
              onClick={handleDownload}
            >
              <FaDownload className="size-7"/>
            </IconButton>
          )}

          <Dialog.Close asChild>
            <IconButton
              theme="default"
              className="cursor-pointer"
            >
              <FaXmark className="size-7"/>
            </IconButton>
          </Dialog.Close>
        </div>

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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-full gap-4 shadow-lg duration-200 outline-none overflow-auto flex flex-row justify-center items-center scrollbar-none"
        >
          {currentItem.type.startsWith("image") ? (
            <ZoomableImage key={currentItem.source} src={currentItem.source}/>
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampImagePanning(valueX: number, valueY: number, image: HTMLImageElement) {
  const maxPanX = Math.max(0, (image.offsetWidth * SCALE_FACTOR - window.innerWidth) / 2);
  const maxPanY = Math.max(0, (image.offsetHeight * SCALE_FACTOR - window.innerHeight) / 2);

  return [
    clamp(valueX, -maxPanX, maxPanX),
    clamp(valueY, -maxPanY, maxPanY),
  ];
}

function ZoomableImage({ src }: { src: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const toggleZoom = (e: MouseEvent<HTMLImageElement>) => {
    if (e.button !== 0) return;

    if (isZoomed) {
      setIsZoomed(false);
      setPan({ x: 0, y: 0 });
    } else {
      if (!imageRef.current) {
        setIsZoomed(true);
        return;
      }

      const img = imageRef.current;
      const rect = img.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const clickX = e.clientX - centerX;
      const clickY = e.clientY - centerY;

      const targetX = clickX * (1 - SCALE_FACTOR);
      const targetY = clickY * (1 - SCALE_FACTOR);

      const [clampedX, clampedY] = clampImagePanning(targetX, targetY, img);

      setPan({
        x: clampedX,
        y: clampedY,
      });

      setIsZoomed(true);
    }
  }

  const handleMouseDown = (e: MouseEvent<HTMLImageElement>) => {
    if (e.button === 1 && isZoomed) {
      e.preventDefault();
      setIsDragging(true);
      setStartPos({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLImageElement>) => {
    if (!isDragging || !isZoomed || !imageRef.current) return;

    // clamping the image movement
    const img = imageRef.current;

    const targetX = e.clientX - startPos.x;
    const targetY = e.clientY - startPos.y;

    const [clampedX, clampedY] = clampImagePanning(targetX, targetY, img);

    setPan({
      x: clampedX,
      y: clampedY,
    });
  };

  const handleMouseUp = (e: MouseEvent<HTMLImageElement>) => {
    if (e.button === 1) {
      setIsDragging(false);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  return (
    <img
      ref={imageRef}
      src={src}
      alt="Image"
      draggable={false}
      onClick={toggleZoom}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`object-contain max-w-[95vw] max-h-[95vh] w-auto h-auto ${
        isDragging
          ? "cursor-grabbing"
          : isZoomed
            ? "cursor-zoom-out"
            : "cursor-zoom-in"
      }`}
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${isZoomed ? SCALE_FACTOR : 1})`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
      }}
    />
  );
}