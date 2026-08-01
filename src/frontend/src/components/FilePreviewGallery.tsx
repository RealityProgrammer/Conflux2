import {Dialog} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {BsChevronLeft, BsChevronRight, BsX} from "react-icons/bs";
import {useEffect, useState, type MouseEvent} from "react";

export type GalleryPreviewItem = {
    file: File;
    previewUrl?: string;
}

export interface FilePreviewGalleryProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: GalleryPreviewItem[];
    initialIndex?: number;
}

export default function FilePreviewGallery({ open, onOpenChange, items, initialIndex = 0 }: FilePreviewGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isZoomed, setIsZoomed] = useState(false);

    const activeItem = items[currentIndex];

    useEffect(() => {
        if (open) {
            setCurrentIndex(initialIndex);
            setIsZoomed(false);
        }
    }, [open, initialIndex]);

    const activeFile = activeItem.file;
    const isImageType = activeFile?.type.startsWith('image/');

    const handleNext = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (currentIndex < items.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsZoomed(false);
        }
    };

    const handlePrev = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsZoomed(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50"/>

                <Dialog.Close asChild>
                    <IconButton
                        isLoading={false}
                        theme="default"
                        className="fixed top-4 right-4 z-60 rounded-full p-2 bg-red-500 size-10 cursor-pointer"
                    >
                        <BsX className="size-8 text-white"/>
                    </IconButton>
                </Dialog.Close>

                {currentIndex > 0 && (
                    <IconButton
                        isLoading={false}
                        theme="default"
                        className="fixed left-4 top-1/2 -translate-y-1/2 z-[60] rounded-full p-2 bg-black/50 hover:bg-black/80 size-12 cursor-pointer pointer-events-auto flex items-center justify-center transition-colors"
                        onClick={handlePrev}
                    >
                        <BsChevronLeft className="size-6 text-white" />
                    </IconButton>
                )}

                {currentIndex < items.length - 1 && (
                    <IconButton
                        isLoading={false}
                        theme="default"
                        className="fixed right-4 top-1/2 -translate-y-1/2 z-[60] rounded-full p-2 bg-black/50 hover:bg-black/80 size-12 cursor-pointer pointer-events-auto flex items-center justify-center transition-colors"
                        onClick={handleNext}
                    >
                        <BsChevronRight className="size-6 text-white" />
                    </IconButton>
                )}

                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 gap-4 shadow-lg duration-200 outline-none w-auto h-[95dvh] aspect-auto cursor-zoom-in overflow-auto flex flex-row items-center">
                    {isImageType && activeItem.previewUrl ? (
                        <img
                            src={activeItem.previewUrl}
                            alt={activeFile.name}
                            onClick={() => setIsZoomed(!isZoomed)}
                            className={`transition-all duration-200 ${isZoomed ? 
                                "w-auto h-auto max-w-none max-h-none cursor-zoom-out" : 
                                "w-auto h-auto max-w-[95vw] max-h-[95vh] object-contain cursor-zoom-in"
                            }`}
                        />
                    ) : activeFile ? (
                        <div className="bg-gray-800 p-10 rounded-lg flex flex-col items-center justify-center text-gray-300 w-[50vw] max-w-md h-[30vh]">
                            <span className="text-lg font-medium text-center truncate w-full px-4">{activeFile.name}</span>
                            <span className="text-sm text-gray-400 mt-2">Preview not available</span>
                        </div>
                    ) : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}