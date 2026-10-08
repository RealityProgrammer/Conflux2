import {Dialog} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {BsChevronLeft, BsChevronRight} from "react-icons/bs";
import {type MouseEvent, useRef, useState} from "react";
import {useEventListener} from "usehooks-ts";
import {FaDownload, FaXmark} from "react-icons/fa6";
import {useMediaGalleryStore} from "../store/useMediaGalleryStore.ts";

const IMAGE_SCALE_FACTOR = 3;

export default function MediaPreviewGallery() {
  const attachments = useMediaGalleryStore(state => state.elements);
  const viewIndex = useMediaGalleryStore(state => state.viewIndex);
  const options = useMediaGalleryStore(state => state.options);
  const clearElements = useMediaGalleryStore(state => state.clearElements);
  const previousElement = useMediaGalleryStore(state => state.previousElement);
  const nextElement = useMediaGalleryStore(state => state.nextElement);

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
    if (!attachments || !options?.downloadUrlProvider) return;

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
    <Dialog.Root open={!!attachments} onOpenChange={(open) => {
      if (!open) {
        clearElements();
      }
    }}>
      <Dialog.Portal>
        <Dialog.Title className="sr-only">Media preview gallery</Dialog.Title>

        <Dialog.Overlay className="backdrop-overlay"/>

        <div className="z-100 absolute top-4 right-4 flex flex-row items-center gap-4 p-2 bg-gray-600 rounded-lg">
          {options?.downloadUrlProvider && (
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
              <FaXmark className="size-6"/>
            </IconButton>
          </Dialog.Close>
        </div>

        {attachments && attachments.length > 0 && (
          <>
              <IconButton
                isLoading={false}
                theme="default"
                className="fixed left-4 top-1/2 -translate-y-1/2 z-60 rounded-full p-2 bg-gray-700 border-2 border-gray-600"
                onClick={handlePrev}
              >
                <BsChevronLeft className="size-7"/>
              </IconButton>

              <IconButton
                isLoading={false}
                theme="default"
                className="fixed right-4 top-1/2 -translate-y-1/2 z-60 rounded-full p-2 bg-gray-700 border-2 border-gray-600"
                onClick={handleNext}
              >
                <BsChevronRight className="size-7"/>
              </IconButton>
          </>
        )}

        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-full gap-4 shadow-lg duration-200 outline-none overflow-auto flex flex-row justify-center items-center scrollbar-none"
        >
          <AttachmentContent/>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AttachmentContent() {
  const viewAttachment = useMediaGalleryStore(state => state.elements?.[state.viewIndex]);

  if (!viewAttachment) return null;

  return (
    <>
      {viewAttachment.mediaType.startsWith("image") ? (
        <ZoomableImage key={viewAttachment.id} src={viewAttachment.src}/>
      ) : viewAttachment.mediaType.startsWith("video") ? (
        <video
          src={viewAttachment.src}
          controls
          autoPlay={false}
          className="w-auto h-auto max-w-[95vw] max-h-[95vh] object-contain"
        />
      ) : viewAttachment.mediaType.startsWith("audio") ? (
        <audio
          src={viewAttachment.src}
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
    </>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampImagePanning(valueX: number, valueY: number, image: HTMLImageElement) {
  const maxPanX = Math.max(0, (image.offsetWidth * IMAGE_SCALE_FACTOR - window.innerWidth) / 2);
  const maxPanY = Math.max(0, (image.offsetHeight * IMAGE_SCALE_FACTOR - window.innerHeight) / 2);

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

      const targetX = clickX * (1 - IMAGE_SCALE_FACTOR);
      const targetY = clickY * (1 - IMAGE_SCALE_FACTOR);

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
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${isZoomed ? IMAGE_SCALE_FACTOR : 1})`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
      }}
    />
  );
}