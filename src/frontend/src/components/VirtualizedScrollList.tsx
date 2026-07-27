import type { ReactNode, RefObject } from "react";
import type { VirtualItem } from "@tanstack/react-virtual";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface VirtualizedScrollListProps<T> {
    items: T[];
    isLoading: boolean;
    pageSize?: number;
    itemHeight: number;
    scrollViewportRef: RefObject<HTMLDivElement>;
    virtualItems: VirtualItem[];
    totalHeight: number;
    emptyState?: ReactNode;

    renderItem: (item: T, index: number) => ReactNode;
    renderSkeletonItem?: (index: number) => ReactNode;
    renderFetchingNext?: () => ReactNode;
}

export default function VirtualizedScrollList<T>({
    items,
    isLoading,
    pageSize = 20,
    itemHeight,
    scrollViewportRef,
    virtualItems,
    totalHeight,
    emptyState,
    renderItem,
    renderSkeletonItem,
    renderFetchingNext,
}: VirtualizedScrollListProps<T>) {
    return (
        <ScrollArea.Root className="flex-1 overflow-hidden rounded">
            <ScrollArea.Viewport
                ref={scrollViewportRef}
                className="size-full rounded-md border-2 border-gray-600 [&>div]:flex! [&>div]:min-h-full [&>div]:flex-col"
            >
                {items.length === 0 && !isLoading ? (
                    emptyState || (
                        <div className="flex flex-1 select-none items-center justify-center text-gray-400">
                            No items found.
                        </div>
                    )
                ) : isLoading ? (
                    /* Rendering items skeleton */
                    renderSkeletonItem && (
                        <>
                            {Array.from({ length: pageSize }).map((_, index: number) => renderSkeletonItem(index))}
                        </>
                    )
                ) : (
                    /* Virtualized List Container */
                    <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
                        {virtualItems.map((virtualItem) => {
                            const isFetchingNext = virtualItem.index >= items.length;
                            const item = items[virtualItem.index];

                            return (
                                <div
                                    key={virtualItem.key}
                                    className={`absolute left-0 top-0 flex w-full flex-row items-center gap-1 transition-colors duration-150 ease-linear hover-highlight`}
                                    style={{
                                        height: `${virtualItem.size}px`,
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                >
                                    {isFetchingNext ?
                                        renderFetchingNext ?
                                            renderFetchingNext() :
                                            null :
                                        renderItem(item, virtualItem.index)
                                    }
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea.Viewport>

            <ScrollArea.Scrollbar
                className="flex w-2 touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight"
                orientation="vertical"
            >
                <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-gray-400 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2" />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
}