import {Avatar, ScrollArea, Tabs} from "radix-ui";
import {BsPeople, BsPerson, BsPersonCheck, BsPersonDash, BsPersonPlus, BsPersonX, BsSearch} from "react-icons/bs";
import {type Ref, useEffect, useRef, useState} from "react";
import {useDebounceCallback, useDebounceValue} from "usehooks-ts";
import {useVirtualizer, type VirtualItem} from "@tanstack/react-virtual";
import {useInfiniteQuery} from "@tanstack/react-query";
import {
    type DiscoverFriendElement,
    type DiscoverFriendsResponse,
    DiscoverFriendStatus, type SendFriendRequestResponse,
    SendFriendRequestResult,
    type ServiceResponse
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import UserAvatar from "../../components/UserAvatar.tsx";
import Spinner from "../../components/Spinner.tsx";

function FriendListTabContent() {
    const searchDebounce = useDebounceCallback(async (value) => {
        console.log("begin search for " + value);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("finish search.");
    }, 500);

    const items = [...Array(100).keys()];

    const scrollViewport = useRef<HTMLDivElement | null>(null);

    const friendsVirtualize = useVirtualizer({
        count: items.length,
        getScrollElement: () => scrollViewport.current,
        estimateSize: () => 52,
        overscan: 5,
    })

    return (
        <div className="flex flex-col gap-2 h-full">
            <div className="flex-none relative w-full flex items-center">
                <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none" />

                <input
                    className="input-field w-full h-11 px-3 pl-8"
                    placeholder="Search..."
                    onChange={(e) => {
                        searchDebounce(e.target.value);
                    }}
                />
            </div>

            <ScrollArea.Root className="flex-1 overflow-hidden rounded">
                <ScrollArea.Viewport ref={scrollViewport} className="border-2 border-gray-600 rounded-md size-full">
                    <div
                        className="relative w-full"
                        style={{ height: `${friendsVirtualize.getTotalSize()}px` }}
                    >
                        { friendsVirtualize.getVirtualItems().map((virtualItem) => {
                            const value = items[virtualItem.index];

                            return (
                                <div key={virtualItem.key}
                                   className="absolute top-0 left-0 w-full p-1.5 flex flex-row gap-1 items-center hover:bg-white/12"
                                   style={{
                                       height: `${virtualItem.size}px`,
                                       transform: `translateY(${virtualItem.start}px)`,
                                   }}
                                >
                                    <Avatar.Root
                                        className="flex-none size-10 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer">
                                        <Avatar.Image
                                            className="size-full rounded-[inherit] object-cover"
                                            src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?&w=128&h=128&dpr=2&q=80"
                                            alt="Test"
                                        />
                                        <Avatar.Fallback
                                            className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11"
                                            delayMs={600}
                                        >
                                            <BsPerson className="fill-black size-5/6"/>
                                        </Avatar.Fallback>
                                    </Avatar.Root>

                                    <p className="ml-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        Friend {value}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea.Viewport>

                <ScrollArea.Scrollbar
                    className="flex touch-none select-none p-0.5 transition-colors duration-160 ease-out hover:bg-white/6 w-2"
                    orientation="vertical"
                >
                    <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-mauve10 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 bg-gray-400"/>
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>
        </div>
    );
}

function AddFriendTabContent() {
    const ITEM_HEIGHT: number = 52;
    const MIN_PAGE_SIZE: number = 20;

    const scrollViewport = useRef<HTMLDivElement | null>(null);
    const [pageSize, setPageSize] = useState(MIN_PAGE_SIZE);

    useEffect(() => {
        if (!scrollViewport.current) {
            return;
        }

        // resize observer to calculate the optimal display size
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                if (height > 0) {
                    const visibleItems = Math.ceil(height / ITEM_HEIGHT);

                    // should we multiply by 2 or plus overscan? multiply is kinda overkill
                    const optimalSize = Math.max(MIN_PAGE_SIZE, visibleItems * 2);
                    setPageSize(optimalSize);
                }
            }
        });

        observer.observe(scrollViewport.current);
        return () => observer.disconnect();
    }, []);

    const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        enabled: !!userNameSearch,
        queryKey: ["discoverUsers", userNameSearch],
        queryFn: async ({ pageParam = 0 }): Promise<DiscoverFriendsResponse | null | undefined> => {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const response: ServiceResponse<DiscoverFriendsResponse> =
                await friendService.discover(userNameSearch, pageParam, pageSize);

            return response.data;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage) return undefined;

            const loadedCount = allPages.reduce(
                (acc, page) => acc + (page?.users.length ?? 0),
                0
            );

            return loadedCount < lastPage.totalCount ? loadedCount : undefined;
        },
    });

    const allUsers = data?.pages.flatMap((page) => page?.users ?? []) ?? [];

    // create virtualizer related objects
    const virtualCount = hasNextPage ? allUsers.length + 1 : allUsers.length;

    const userVirtualize = useVirtualizer({
        count: virtualCount,
        getScrollElement: () => scrollViewport.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 5,
    });

    const virtualItems = userVirtualize.getVirtualItems();

    // trigger next query when scrolling near the end
    useEffect(() => {
        const lastVirtualItem = virtualItems[virtualItems.length - 1];
        if (!lastVirtualItem) return;

        if (lastVirtualItem.index >= allUsers.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [
        virtualItems,
        allUsers.length,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    ]);

    return (
        <div className="flex flex-col gap-2 h-full">
            <header className="flex-none">
                <p>In search of a friend?</p>
                <p>You can send friend request with their username.</p>
            </header>

            <section className="flex-none flex flex-row">
                <div className="select-none w-11 h-11 flex justify-center items-center border border-gray-600 rounded-l-lg border-r-0">
                    @
                </div>

                <input className="flex-1 input-field w-full h-11 px-3 rounded-l-none"
                       placeholder="Enter friend's username"
                       onChange={(e) => {
                           setUserNameSearch(e.target.value);
                       }}/>
            </section>

            <AddFriendSearchResultContainer userNameSearch={userNameSearch}
                                            isLoading={isLoading}
                                            pageSize={pageSize}
                                            itemHeight={ITEM_HEIGHT}
                                            scrollViewportRef={scrollViewport}
                                            virtualizeHeight={userVirtualize.getTotalSize()}
                                            virtualItems={virtualItems}
                                            userResults={allUsers}/>
        </div>
    );
}

interface FriendSearchResultContainerProps {
    userNameSearch: string;
    isLoading: boolean;
    pageSize: number;
    itemHeight: number;
    scrollViewportRef: Ref<HTMLDivElement>;
    virtualizeHeight: number;
    virtualItems: VirtualItem[];
    userResults: DiscoverFriendElement[];
}

function AddFriendSearchResultContainer(
    {
        userNameSearch,
        isLoading,
        pageSize,
        itemHeight,
        scrollViewportRef,
        virtualizeHeight,
        virtualItems,
        userResults,
    }: FriendSearchResultContainerProps
) {
    const [executingIds, setExecutingIds] = useState<Set<string>>(new Set<string>());

    const handleSetExecutingId = async (userId: string, action: () => Promise<void>): Promise<void> => {
        setExecutingIds(prev => new Set(prev).add(userId));

        try {
            await action();
        } finally {
            setExecutingIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const handleSendFriendRequest = async (user: DiscoverFriendElement): Promise<void> => {
        handleSetExecutingId(user.userId, async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response: ServiceResponse<SendFriendRequestResponse> =
                await friendService.sendFriendRequest(user.userId);

            if (response.success && response.data) {
                switch (response.data.result) {
                    case SendFriendRequestResult.Failure:
                        break;

                    case SendFriendRequestResult.Friended:
                        user.status = DiscoverFriendStatus.Friended;
                        break;

                    case SendFriendRequestResult.Requested:
                        user.status = DiscoverFriendStatus.OutcomingRequest;
                        break;
                }
            }
        });
    };

    const handleAcceptFriendRequest  = (user: DiscoverFriendElement) => {
        handleSetExecutingId(user.userId, async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response: ServiceResponse =
                await friendService.acceptFriendRequest(user.userId);

            if (response.success) {
                user.status = DiscoverFriendStatus.Friended;
            }
        });
    };

    const handleCancelFriendRequest = (user: DiscoverFriendElement) => {
        handleSetExecutingId(user.userId, async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response: ServiceResponse =
                await friendService.cancelFriendRequest(user.userId);

            if (response.success) {
                user.status = DiscoverFriendStatus.Stranger;
            }
        });
    };

    return (
        <ScrollArea.Root className="flex-1 overflow-hidden rounded">
            { !userNameSearch ? (
                <div className="select-none flex size-full items-center justify-center text-gray-400 border-2 border-gray-600 rounded-md">
                    See the textbox above? Insert the name of user there and we will search for them.
                </div>
            ) : isLoading ? (
                <div className="flex size-full flex-col border-2 border-gray-600 rounded-md">
                    {Array.from({ length: pageSize }).map((_, index) => (
                        <div
                            key={index}
                            className="w-full p-1.5 flex flex-row gap-1 items-center border-b border-white/5"
                            style={{ height: `${itemHeight}px` }}
                        >
                            {/* Avatar Skeleton */}
                            <div className="flex-none size-10 rounded-full bg-white/10 animate-pulse" />

                            {/* Username Skeleton */}
                            <div className="ml-2 h-4 w-32 rounded bg-white/10 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <ScrollArea.Viewport ref={scrollViewportRef} className="border-2 border-gray-600 rounded-md size-full">
                    <div
                        className="relative w-full"
                        style={{ height: `${virtualizeHeight}px` }}
                    >
                        { virtualItems.map((virtualItem) => {
                            const isLoading = virtualItem.index >= userResults.length;
                            const user = userResults[virtualItem.index];

                            return (
                                <div key={virtualItem.key}
                                     className="absolute top-0 left-0 w-full px-3 py-1.5 flex flex-row gap-1 items-center hover:bg-white/12 transition-colors duration-150 ease-linear"
                                     style={{
                                         height: `${virtualItem.size}px`,
                                         transform: `translateY(${virtualItem.start}px)`,
                                     }}
                                >
                                    { isLoading ?
                                        <div className="h-10 flex flex-row gap-2 justify-center items-center">
                                            Loading...
                                        </div>
                                        :
                                        <>
                                            <UserAvatar
                                                userId={user.userId}
                                                hasAvatar={user.hasAvatar}
                                                className="flex-none size-10 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"/>

                                            <div className="flex-1 flex flex-col">
                                                <p className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                                    {user.displayName}
                                                </p>
                                                <p className="text-sm text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                                                    @{user.userName}
                                                </p>
                                            </div>

                                            <div className="flex-none flex flex-row gap-2 justify-center items-center">
                                                {executingIds.has(user.userId) ? (
                                                    <Spinner className="fill-white size-6"/>
                                                ) : (
                                                    user.status == DiscoverFriendStatus.Stranger ? (
                                                        <button onClick={() => handleSendFriendRequest(user)}>
                                                            <BsPersonPlus className="fill-green-300 hover:fill-green-500 size-6 cursor-pointer"/>
                                                        </button>
                                                    ) : user.status == DiscoverFriendStatus.IncomingRequest ? (
                                                        <button onClick={() => handleAcceptFriendRequest(user)}>
                                                            <BsPersonCheck className="fill-green-300 hover:fill-green-500 size-6 cursor-pointer"/>
                                                        </button>
                                                    ) : user.status == DiscoverFriendStatus.OutcomingRequest ? (
                                                        <button onClick={() => handleCancelFriendRequest(user)}>
                                                            <BsPersonX className="fill-red-400 hover:fill-red-500 size-6 cursor-pointer"/>
                                                        </button>
                                                    ) : user.status == DiscoverFriendStatus.Friended ? (
                                                        <BsPersonDash className="fill-red-500 size-6 cursor-pointer"/>
                                                    ) : null
                                                )}
                                            </div>
                                        </>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea.Viewport>
            )}

            <ScrollArea.Scrollbar
                className="flex touch-none select-none p-0.5 transition-colors duration-160 ease-out hover:bg-white/6 w-2"
                orientation="vertical"
            >
                <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-mauve10 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 bg-gray-400"/>
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
}

export default function FriendsPage() {
    const [tabValue, setTabValue] = useState("friends");

    return (
        <div className="flex flex-col overflow-hidden size-full">
            <header className="flex-none basis-10 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2">
                <BsPeople className="fill-white size-6 mr-2"/>

                <p className="text-white">Everybody need a friend or two...</p>
            </header>

            <div className="flex-1 bg-gray-700 flex flex-col min-h-0 px-2 pb-2">
                <Tabs.Root value={tabValue} onValueChange={setTabValue} className="flex-1 min-h-0 flex flex-col mt-2 text-white h-full">
                    <Tabs.List className="flex flex-row flex-nowrap gap-3 flex-none border-b-gray-600 border-b-2">
                        <Tabs.Trigger value="friends" className={`px-2 py-1 hover:bg-white/12 rounded-t-md cursor-pointer ${tabValue === "friends" && "bg-white/8"}`}>Friends</Tabs.Trigger>
                        <Tabs.Trigger value="pending" className={`px-2 py-1 hover:bg-white/12 rounded-t-md cursor-pointer ${tabValue === "pending" && "bg-white/8"}`}>Pending</Tabs.Trigger>
                        <Tabs.Trigger value="blocked" className={`px-2 py-1 hover:bg-white/12 rounded-t-md cursor-pointer ${tabValue === "blocked" && "bg-white/8"}`}>Blocked</Tabs.Trigger>
                        <Tabs.Trigger value="add-friend" className={`px-2 py-1 hover:bg-white/12 rounded-t-md cursor-pointer ${tabValue === "add-friend" && "bg-white/8"}`}>Add Friend</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="friends" className="pt-2 flex-1 min-h-0">
                        <FriendListTabContent/>
                    </Tabs.Content>

                    <Tabs.Content value="pending" className="pt-2 flex-1 min-h-0">
                        Pending
                    </Tabs.Content>

                    <Tabs.Content value="blocked" className="pt-2 flex-1 min-h-0">
                        Blocked
                    </Tabs.Content>

                    <Tabs.Content value="add-friend" className="pt-2 flex-1 min-h-0">
                        <AddFriendTabContent/>
                    </Tabs.Content>
                </Tabs.Root>
            </div>
        </div>
    );
}