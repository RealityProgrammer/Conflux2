import { Dialog } from "radix-ui";
import IconButton from "./IconButton.tsx";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import { type MouseEvent, useRef, useState } from "react";
import { useEventListener } from "usehooks-ts";
import { FaDownload, FaXmark } from "react-icons/fa6";
import { useMediaGalleryStore } from "../store/useMediaGalleryStore.ts";

const IMAGE_SCALE_FACTOR = 3;

export default function MediaPreviewGallery() {
  const elements = useMediaGalleryStore((state) => state.elements);
  const viewIndex = useMediaGalleryStore((state) => state.viewIndex);
  const options = useMediaGalleryStore((state) => state.options);
  const clearElements = useMediaGalleryStore((state) => state.clearElements);
  const previousElement = useMediaGalleryStore((state) => state.previousElement);
  const nextElement = useMediaGalleryStore((state) => state.nextElement);

  const handlePrev = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();

    previousElement();
  };

  const handleNext = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();

    nextElement();
  };

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>) => {
    if (!elements || !options?.downloadUrlProvider) return;

    e.preventDefault();
    e.stopPropagation();

    const link = document.createElement("a");
    link.href = await options.downloadUrlProvider(viewIndex);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEventListener("keydown", (e: KeyboardEvent) => {
    if (!open) return;

    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  });

  return (
    <Dialog.Root
      open={!!elements && elements.length > 0}
      onOpenChange={(open) => {
        if (!open) {
          clearElements();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Title className="sr-only">Media preview gallery</Dialog.Title>

        <Dialog.Overlay className="backdrop-overlay" />

        <div className="absolute top-4 right-4 z-100 flex flex-row items-center gap-4 rounded-lg bg-gray-600 p-2">
          {options?.downloadUrlProvider && (
            <IconButton
              theme="default"
              className="cursor-pointer"
              onClick={handleDownload}
              isLoading={false}
            >
              <FaDownload className="size-7" />
            </IconButton>
          )}

          <Dialog.Close asChild>
            <IconButton theme="default" className="cursor-pointer">
              <FaXmark className="size-6" />
            </IconButton>
          </Dialog.Close>
        </div>

        {elements && elements.length > 1 && (
          <>
            <IconButton
              isLoading={false}
              theme="default"
              className="fixed top-1/2 left-4 z-60 -translate-y-1/2 rounded-full border-2 border-gray-600 bg-gray-700 p-2"
              onClick={handlePrev}
            >
              <BsChevronLeft className="size-7" />
            </IconButton>

            <IconButton
              isLoading={false}
              theme="default"
              className="fixed top-1/2 right-4 z-60 -translate-y-1/2 rounded-full border-2 border-gray-600 bg-gray-700 p-2"
              onClick={handleNext}
            >
              <BsChevronRight className="size-7" />
            </IconButton>
          </>
        )}

        <Dialog.Content className="fixed top-1/2 left-1/2 flex size-full -translate-x-1/2 -translate-y-1/2 scrollbar-none flex-row items-center justify-center gap-4 overflow-auto shadow-lg duration-200 outline-none">
          <AttachmentContent />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AttachmentContent() {
  const attachment = useMediaGalleryStore((state) => state.elements?.[state.viewIndex]);

  if (!attachment) return null;

  return (
    <>
      {attachment.mediaType.startsWith("image") && !!attachment.src ? (
        <ZoomableImage key={attachment.id} src={attachment.src} />
      ) : attachment.mediaType.startsWith("video") ? (
        <video
          src={attachment.src}
          controls
          autoPlay={false}
          className="h-auto max-h-[95vh] w-auto max-w-[95vw] object-contain"
        />
      ) : attachment.mediaType.startsWith("audio") ? (
        <audio src={attachment.src} controls autoPlay={false} className="h-auto w-full max-w-[95vw]" />
      ) : (
        <div className="flex h-[30vh] w-[50vw] max-w-md flex-col items-center justify-center rounded-lg bg-gray-800 p-10 text-gray-300">
          <span className="w-full px-4 text-center text-lg font-medium">
            Preview is not available for this type of attachment
          </span>
        </div>
      )}
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampImagePanning(valueX: number, valueY: number, image: HTMLImageElement) {
  const maxPanX = Math.max(0, (image.offsetWidth * IMAGE_SCALE_FACTOR - window.innerWidth) / 2);
  const maxPanY = Math.max(0, (image.offsetHeight * IMAGE_SCALE_FACTOR - window.innerHeight) / 2);

  return [clamp(valueX, -maxPanX, maxPanX), clamp(valueY, -maxPanY, maxPanY)];
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

      const targetX = clickX * (1 - IMAGE_SCALE_FACTOR);
      const targetY = clickY * (1 - IMAGE_SCALE_FACTOR);

      const [clampedX, clampedY] = clampImagePanning(targetX, targetY, img);

      setPan({
        x: clampedX,
        y: clampedY,
      });

      setIsZoomed(true);
    }
  };

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
      className={`h-auto max-h-[95vh] w-auto max-w-[95vw] object-contain ${
        isDragging ? "cursor-grabbing" : isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
      }`}
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${isZoomed ? IMAGE_SCALE_FACTOR : 1})`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
      }}
    />
  );
}
