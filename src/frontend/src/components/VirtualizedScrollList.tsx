import {
    type ComponentPropsWithoutRef,
    type HTMLAttributes,
    type ReactNode,
    type RefObject,
    useEffect,
    useRef
} from "react";
import {useVirtualizer, type VirtualItem} from "@tanstack/react-virtual";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface VirtualizedScrollListProps<T> extends ComponentPropsWithoutRef<typeof ScrollArea.Root> {
    viewportClassName?: string;

    items: T[];
    isLoading: boolean;
    estimateSize: ((index: number) => number) | number;
    pageSize?: number;
    overscan?: number;

    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void | Promise<void>;

    renderEmpty?: () => ReactNode;
    renderItem: (item: T, index: number) => ReactNode;
    renderSkeletonItem?: (index: number) => ReactNode;
    renderFetchingNext?: () => ReactNode;
}

export default function VirtualizedScrollList<T>({
    className,
    viewportClassName,
    items,
    isLoading,
    estimateSize,
    pageSize = 20,
    overscan = 5,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    renderEmpty,
    renderItem,
    renderSkeletonItem,
    renderFetchingNext,
    ...props
}: VirtualizedScrollListProps<T>) {
    const scrollViewportRef = useRef<HTMLDivElement>(null!);

    const virtualCount = hasNextPage ? items.length + 1 : items.length;

    const virtualizer = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => scrollViewportRef.current,
        estimateSize: typeof estimateSize === 'function' ? estimateSize : () => estimateSize,
        overscan,
    });

    const virtualItems = virtualizer.getVirtualItems();
    const totalHeight = virtualizer.getTotalSize();

    // trigger next page load
    useEffect(() => {
        if (!fetchNextPage) return;

        const lastVirtualItem = virtualItems[virtualItems.length - 1];
        if (!lastVirtualItem) return;

        if (lastVirtualItem.index >= items.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [virtualItems, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <ScrollArea.Root className={`overflow-hidden ${className}`} {...props}>
            <ScrollArea.Viewport
                ref={scrollViewportRef}
                className={`size-full [&>div]:flex! [&>div]:min-h-full [&>div]:flex-col ${viewportClassName || ""}`}
            >
                {items.length === 0 && !isLoading ? (
                    renderEmpty?.()
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
                                    // according to https://tanstack.com/virtual/latest/docs/api/virtualizer#measureelement-2
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    className={`absolute left-0 top-0 flex w-full flex-row items-center gap-1 transition-colors duration-150 ease-linear hover-highlight`}
                                    style={{
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