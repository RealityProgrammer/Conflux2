import {
    type ComponentPropsWithoutRef,
    type HTMLAttributes, type Key,
    type ReactNode,
    type RefObject,
    useEffect, useImperativeHandle, useLayoutEffect,
    useRef
} from "react";
import {type ReactVirtualizer, useVirtualizer, type VirtualItem} from "@tanstack/react-virtual";
import * as ScrollArea from "@radix-ui/react-scroll-area";

export type EstimateHeightTarget = 'previousLoader' | 'nextLoader' | { itemIndex: number };

export interface VirtualizedScrollListProps extends ComponentPropsWithoutRef<typeof ScrollArea.Root> {
    virtualizerRef?: RefObject<ReactVirtualizer<HTMLDivElement, Element>>;
    viewportRef?: RefObject<HTMLDivElement | null>;
    viewportClassName?: string;
    containerClassName?: string;

    itemCount: number;
    isLoading: boolean;
    estimateSize: (target: EstimateHeightTarget) => number;
    pageSize?: number;
    overscan?: number;
    keyExtractor?: (index: number) => Key;

    hasPreviousPage?: boolean;
    isFetchingPreviousPage?: boolean;
    fetchPreviousPage?: () => void | Promise<void>;

    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void | Promise<void>;

    renderEmpty?: () => ReactNode;
    renderItem: (itemIndex: number, virtualItem: VirtualItem) => ReactNode;
    renderSkeletonItem?: (index: number) => ReactNode;

    renderFetchingPrevious?: () => ReactNode;
    renderFetchingNext?: () => ReactNode;
}

export default function VirtualizedScrollList({
    virtualizerRef,
    viewportRef,
    className,
    viewportClassName,
    containerClassName,
    itemCount,
    isLoading,
    estimateSize,
    pageSize = 20,
    overscan = 5,
    keyExtractor,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    renderEmpty,
    renderItem,
    renderSkeletonItem,
    renderFetchingPrevious,
    renderFetchingNext,
    ...props
}: VirtualizedScrollListProps) {
    const scrollViewportRef = useRef<HTMLDivElement>(null!);

    const prevOffset = hasPreviousPage ? 1 : 0;
    const nextOffset = hasNextPage ? 1 : 0;
    const virtualCount = prevOffset + itemCount + nextOffset;

    const virtualizer = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => scrollViewportRef.current,
        estimateSize: (index) => {
            if (hasPreviousPage && index == 0) return estimateSize('previousLoader');
            if (hasNextPage && index == virtualCount - 1) return estimateSize('nextLoader');

            return estimateSize({ itemIndex: index - prevOffset });
        },
        overscan,
        getItemKey: (index) => {
            if (index === 0 && hasPreviousPage) return '__loader-prev';
            if (index === virtualCount - 1 && hasNextPage) return '__loader-next';

            const itemIndex = index - prevOffset;

            if (keyExtractor) {
                return keyExtractor(itemIndex);
            }
            return index;
        }
    });

    useImperativeHandle(virtualizerRef, () => virtualizer, [virtualizer]);

    const prevFirstItemKey = useRef<Key | null>(null);
    const prevTotalSize = useRef(0);
    const justPrepended = useRef(false);

    useLayoutEffect(() => {
        const currentTotalSize = virtualizer.getTotalSize();
        const currentFirstItemKey = itemCount > 0 && keyExtractor ? keyExtractor(0) : null;

        if (currentFirstItemKey !== null && prevFirstItemKey.current !== null && currentFirstItemKey !== prevFirstItemKey.current) {
            const sizeDiff = currentTotalSize - prevTotalSize.current;
            if (scrollViewportRef.current && sizeDiff > 0) {
                scrollViewportRef.current.scrollTop += sizeDiff;

                justPrepended.current = true;
                requestAnimationFrame(() => {
                    justPrepended.current = false;
                });
            }
        }

        prevFirstItemKey.current = currentFirstItemKey;
    }, [itemCount, keyExtractor, virtualizer]);

    useLayoutEffect(() => {
        prevTotalSize.current = virtualizer.getTotalSize();
    });

    const virtualItems = virtualizer.getVirtualItems();
    const totalHeight = virtualizer.getTotalSize();

    // trigger previous page load
    useEffect(() => {
        if (justPrepended.current || !fetchPreviousPage || virtualItems.length === 0) return;

        const firstVirtualItem = virtualItems[0];
        if (firstVirtualItem.index === 0 && hasPreviousPage && !isFetchingPreviousPage) {
            fetchPreviousPage();
        }
    }, [virtualItems, hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage]);

    // trigger next page load
    useEffect(() => {
        if (!fetchNextPage || virtualItems.length === 0) return;

        const lastVirtualItem = virtualItems.at(-1)!;
        if (lastVirtualItem.index >= virtualCount - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [virtualItems, itemCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <ScrollArea.Root className={`overflow-hidden ${className ?? ''}`} {...props}>
            <ScrollArea.Viewport
                ref={(node) => {
                    scrollViewportRef.current = node!;

                    if (viewportRef) {
                        viewportRef.current = node!;
                    }
                }}
                className={`size-full [&>div]:flex! [&>div]:min-h-full [&>div]:flex-col ${viewportClassName || ""}`}
                style={{ overflowAnchor: 'none' }}
            >
                {itemCount === 0 && !isLoading ? (
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
                    <div className={`relative w-full ${containerClassName ?? ""}`} style={{ height: `${totalHeight}px` }}>
                        {virtualItems.map((virtualItem) => {
                            const shouldRenderFetchingPrevious = hasPreviousPage && virtualItem.index === 0;
                            const shouldRenderFetchingNext = hasNextPage && virtualItem.index === virtualCount - 1;

                            const itemIndex = virtualItem.index - prevOffset;

                            return (
                                <div
                                    key={virtualItem.key}
                                    // according to https://tanstack.com/virtual/latest/docs/api/virtualizer#measureelement-2
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    className={`absolute left-0 top-0 flex w-full`}
                                    style={{
                                        transform: `translateY(${virtualItem.start}px)`,
                                        height: `${virtualItem.size}px`,
                                    }}
                                >
                                    {shouldRenderFetchingPrevious ?
                                        renderFetchingPrevious && renderFetchingPrevious() :
                                    shouldRenderFetchingNext ?
                                        renderFetchingNext && renderFetchingNext() :
                                        renderItem(itemIndex, virtualItem)
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