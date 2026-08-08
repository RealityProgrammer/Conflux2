import {Dialog} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {BsChevronLeft, BsChevronRight, BsX} from "react-icons/bs";
import {useEffect, useState, type MouseEvent} from "react";
import {useEventListener} from "usehooks-ts";

export type MediaGalleryItem = {
    source: string;
    type: string;
}

export interface MediaGalleryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    initialItem: MediaGalleryItem;
    hasPreviousItem: () => boolean;
    getPreviousItem: () => MediaGalleryItem;
    hasNextItem: () => boolean;
    getNextItem: () => MediaGalleryItem;
}

export default function MediaPreviewGallery({
    open,
    onOpenChange,
    initialItem,
    hasPreviousItem: hasPreviousItemFn,
    getPreviousItem: getPreviousItemFn,
    hasNextItem: hasNextItemFn,
    getNextItem: getNextItemFn,
}: MediaGalleryProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const [currentItem, setCurrentItem] = useState<MediaGalleryItem>(initialItem);

    useEffect(() => {
        if (open) {
            setCurrentItem(initialItem);
            setIsZoomed(false);
        }
    }, [initialItem, open]);

    const hasPreviousItem = hasPreviousItemFn();
    const handlePrev = (e?: MouseEvent<HTMLButtonElement>) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (hasPreviousItem) {
            setCurrentItem(getPreviousItemFn());
            setIsZoomed(false);
        }
    };

    const hasNextItem = hasNextItemFn();
    const handleNext = (e?: MouseEvent<HTMLButtonElement>) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (hasNextItem) {
            setCurrentItem(getNextItemFn());
            setIsZoomed(false);
        }
    };

    // arrow navigation goes hard
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "ArrowRight") handleNext();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, handlePrev, handleNext]);

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
                        <BsChevronLeft className="size-6 text-white" />
                    </IconButton>
                )}

                {hasNextItem && (
                    <IconButton
                        isLoading={false}
                        theme="default"
                        className="fixed right-4 top-1/2 -translate-y-1/2 z-60 rounded-full p-2 bg-black/50 hover:bg-black/80 size-12 cursor-pointer pointer-events-auto flex items-center justify-center transition-colors"
                        onClick={handleNext}
                    >
                        <BsChevronRight className="size-6 text-white" />
                    </IconButton>
                )}

                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 gap-4 shadow-lg duration-200 outline-none w-auto h-[95dvh] aspect-auto cursor-zoom-in overflow-auto flex flex-row items-center">
                    {currentItem.type.startsWith("image") ? (
                        <img
                            src={currentItem.source}
                            alt="Alt"
                            onClick={() => setIsZoomed(!isZoomed)}
                            className={`transition-all duration-200 ${isZoomed ? 
                                "w-auto h-auto max-w-none max-h-none cursor-zoom-out" : 
                                "w-auto h-auto max-w-[95vw] max-h-[95vh] object-contain cursor-zoom-in"
                            }`}
                        />
                    ) : (
                        <div className="bg-gray-800 p-10 rounded-lg flex flex-col items-center justify-center text-gray-300 w-[50vw] max-w-md h-[30vh]">
                            <span className="text-lg font-medium text-center truncate w-full px-4">Preview is not available for this type of attachment</span>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}