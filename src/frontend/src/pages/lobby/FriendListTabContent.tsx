import {useDebounceValue} from "usehooks-ts";
import {useEffect, useRef, useState} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import {BsPerson, BsSearch} from "react-icons/bs";
import {Avatar, ScrollArea} from "radix-ui";
import {useInfiniteQuery} from "@tanstack/react-query";
import type {
    PaginatedResponse,
    QueryFriendElement,
    ServiceResponse
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import UserAvatar from "../../components/UserAvatar.tsx";

interface FriendRowProps {
    element: QueryFriendElement;
    itemHeight: number;
}

export default function FriendListTabContent() {
    const ITEM_HEIGHT: number = 52;
    const MIN_PAGE_SIZE: number = 20;

    const scrollViewportRef = useRef<HTMLDivElement>(null!);

    const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);
    const [pageSize, setPageSize] = useState(MIN_PAGE_SIZE);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ["queryFriends", userNameSearch],
        queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse<QueryFriendElement> | null | undefined> => {
            const response: ServiceResponse<PaginatedResponse<QueryFriendElement>> =
                await friendService.queryFriends(userNameSearch, pageParam, pageSize);

            return response.data;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage) return undefined;

            const loadedCount = allPages.reduce(
                (acc, page) => acc + (page?.elements.length ?? 0),
                0
            );

            return loadedCount < lastPage.totalCount ? loadedCount : undefined;
        },
    });

    const allElements = data?.pages.flatMap((page) => page?.elements ?? []) ?? [];

    // create virtualizer related objects
    const virtualCount = hasNextPage ? allElements.length + 1 : allElements.length;

    const virtualizer = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => scrollViewportRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 5,
    });

    const virtualItems = virtualizer.getVirtualItems();

    // trigger next query when scrolling near the end
    useEffect(() => {
        const lastVirtualItem = virtualItems[virtualItems.length - 1];
        if (!lastVirtualItem) return;

        if (lastVirtualItem.index >= allElements.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [virtualItems, allElements.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="flex flex-col gap-2 h-full">
            <div className="flex-none relative w-full flex items-center">
                <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none" />

                <input className="input-field w-full h-11 px-3 pl-8"
                       placeholder="Search..."
                       onChange={(e) => {
                           setUserNameSearch(e.target.value);
                       }}/>
            </div>

            <ScrollArea.Root className="flex-1 overflow-hidden rounded">
                <ScrollArea.Viewport ref={scrollViewportRef} className="size-full [&>div]:flex! [&>div]:flex-col [&>div]:min-h-full border-2 border-gray-600 rounded-md">
                    { allElements.length === 0 ? (
                        <div className="flex flex-1 select-none items-center justify-center text-gray-400">
                            Nobody here... So very lonely...
                        </div>
                    ) : isLoading ? (
                        <div className="flex size-full flex-col border-2 border-gray-600 rounded-md">
                            {Array.from({ length: pageSize }).map((_, index) => (
                                <div
                                    key={index}
                                    className="w-full p-1.5 flex flex-row gap-1 items-center border-b border-white/5"
                                    style={{ height: `${ITEM_HEIGHT}px` }}
                                >
                                    {/* Avatar Skeleton */}
                                    <div className="flex-none size-10 rounded-full bg-white/10 animate-pulse" />

                                    {/* Username Skeleton */}
                                    <div className="ml-2 h-4 w-32 rounded bg-white/10 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            className="relative w-full"
                            style={{ height: `${virtualizer.getTotalSize()}px` }}
                        >
                            { virtualizer.getVirtualItems().map((virtualItem) => {
                                const element = allElements[virtualItem.index];

                                return (
                                    <div key={virtualItem.key}
                                         className="absolute top-0 left-0 w-full p-1.5 flex flex-row gap-1 items-center hover-highlight"
                                         style={{
                                             height: `${virtualItem.size}px`,
                                             transform: `translateY(${virtualItem.start}px)`,
                                         }}
                                    >
                                        { isLoading ? (
                                            <div className="h-10 flex flex-row gap-2 justify-center items-center">
                                                Loading...
                                            </div>
                                        ) : (
                                            <FriendRow element={element}
                                                       itemHeight={ITEM_HEIGHT}/>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea.Viewport>

                <ScrollArea.Scrollbar
                    className="flex touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight w-2"
                    orientation="vertical"
                >
                    <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-mauve10 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 bg-gray-400"/>
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>
        </div>
    );
}

function FriendRow({ element, itemHeight }: FriendRowProps) {
    return (
        <>
            <UserAvatar
                userId={element.userId}
                hasAvatar={element.hasAvatar}
                className="flex-none size-10 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"/>

            <div className="flex-1 flex flex-col">
                <p className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {element.displayName}
                </p>
                <p className="text-sm text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                    @{element.userName}
                </p>
            </div>
        </>
    );
}