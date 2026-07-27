import {type Ref, useEffect, useRef, useState} from "react";
import {useDebounceValue} from "usehooks-ts";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {
    type DiscoverFriendElement,
    type DiscoverFriendsResponse,
    DiscoverFriendStatus,
    type SendFriendRequestResponse,
    SendFriendRequestResult,
    type ServiceResponse
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import {useVirtualizer, type VirtualItem} from "@tanstack/react-virtual";
import {useGlobalEvent} from "../../hooks/useGlobalEvent.ts";
import type {
    FriendRequestAcceptedNotification,
    FriendRequestCanceledNotification,
    FriendRequestReceivedNotification,
    FriendRequestRejectedNotification,
    UnfriendedNotification
} from "../../api/notifications.ts";
import {DropdownMenu, ScrollArea} from "radix-ui";
import UserAvatar from "../../components/UserAvatar.tsx";
import {BsPersonCheck, BsPersonDash, BsPersonPlus, BsPersonX, BsThreeDotsVertical} from "react-icons/bs";
import IconButton, {IconButtonTheme} from "../../components/IconButton.tsx";

type FriendActionType = 'send' | 'accept' | 'reject' | 'cancel' | 'unfriend';

interface SearchResultContainerProps {
    userNameSearch: string;
    isLoading: boolean;
    pageSize: number;
    itemHeight: number;
    scrollViewportRef: Ref<HTMLDivElement>;
    virtualizeHeight: number;
    virtualItems: VirtualItem[];
    userResults: DiscoverFriendElement[];
}

interface SearchResultRowProps {
    user: DiscoverFriendElement;
    onFriendAction: (userId: string, actionType: FriendActionType) => Promise<void>;
    executingActionType: FriendActionType | null;
}

export default function AddFriendTabContent() {
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

            <SearchResultContainer userNameSearch={userNameSearch}
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

function SearchResultContainer(
    {
        userNameSearch,
        isLoading,
        pageSize,
        itemHeight,
        scrollViewportRef,
        virtualizeHeight,
        virtualItems,
        userResults,
    }: SearchResultContainerProps
) {
    const [executingActions, setExecutingActions] = useState<Map<string, FriendActionType>>(new Map<string, FriendActionType>());
    const queryClient = useQueryClient();

    const updateCacheStatus = (userId: string, newStatus: DiscoverFriendStatus) => {
        queryClient.setQueryData<InfiniteData<DiscoverFriendsResponse>>(
            ["discoverUsers", userNameSearch],
            (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        users: page.users.map(user => {
                            return user.userId === userId ? {...user, status: newStatus} : user;
                        })
                    }))
                };
            }
        );
    };

    const handleAction = async (userId: string, actionType: FriendActionType) => {
        setExecutingActions(prev => new Map(prev).set(userId, actionType));
        try {
            let success = false;
            let targetStatus = DiscoverFriendStatus.Stranger;

            switch (actionType) {
                case 'send': {
                    const response: ServiceResponse<SendFriendRequestResponse> =
                        await friendService.sendFriendRequest(userId);

                    success = response.success;

                    if (success && response.data) {
                        targetStatus = response.data.result === SendFriendRequestResult.Friended
                            ? DiscoverFriendStatus.Friended
                            : DiscoverFriendStatus.OutcomingRequest;
                    }
                    break;
                }

                case 'accept':
                    success = (await friendService.acceptFriendRequest(userId)).success;
                    targetStatus = DiscoverFriendStatus.Friended;
                    break;

                case 'reject':
                    success = (await friendService.rejectFriendRequest(userId)).success;
                    targetStatus = DiscoverFriendStatus.Stranger; // Or whatever your UI expects
                    break;

                case 'cancel':
                    success = (await friendService.cancelFriendRequest(userId)).success;
                    targetStatus = DiscoverFriendStatus.Stranger;
                    break;

                case 'unfriend':
                    success = (await friendService.unfriend(userId)).success;
                    targetStatus = DiscoverFriendStatus.Stranger;
                    break;
            }

            if (success) {
                updateCacheStatus(userId, targetStatus);
            }
        } finally {
            setExecutingActions(prev => {
                const next = new Map(prev);
                next.delete(userId);
                return next;
            });
        }
    }

    // handle realtime modification
    useGlobalEvent("lobby:friendRequestReceived", (notif: FriendRequestReceivedNotification) => {
        updateCacheStatus(notif.senderUserId, DiscoverFriendStatus.IncomingRequest);
    });

    useGlobalEvent("lobby:friendRequestCanceled", (notif: FriendRequestCanceledNotification) => {
        updateCacheStatus(notif.senderUserId, DiscoverFriendStatus.Stranger);
    });

    useGlobalEvent("lobby:friendRequestAccepted", (notif: FriendRequestAcceptedNotification) => {
        updateCacheStatus(notif.acceptorUserId, DiscoverFriendStatus.Friended);
    });

    useGlobalEvent("lobby:friendRequestRejected", (notif: FriendRequestRejectedNotification) => {
        updateCacheStatus(notif.rejecterUserId, DiscoverFriendStatus.Stranger);
    });

    useGlobalEvent("lobby:unfriended", (notif: UnfriendedNotification) => {
        updateCacheStatus(notif.invokerUserId, DiscoverFriendStatus.Stranger);
    });

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
                                     className="absolute top-0 left-0 w-full px-3 py-1.5 flex flex-row gap-1 items-center hover-highlight transition-colors duration-150 ease-linear"
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
                                        <UserSearchRow
                                            user={user}
                                            onFriendAction={handleAction}
                                            executingActionType={executingActions.get(user.userId) ?? null}/>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea.Viewport>
            )}

            <ScrollArea.Scrollbar
                className="flex touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight w-2"
                orientation="vertical"
            >
                <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-mauve10 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 bg-gray-400"/>
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    );
}

function UserSearchRow({ user, onFriendAction, executingActionType }: SearchResultRowProps) {
    const handleSendFriendRequest = () => onFriendAction(user.userId, 'send');
    const handleAcceptFriendRequest = () => onFriendAction(user.userId, 'accept');
    const handleRejectFriendRequest = () => onFriendAction(user.userId, 'reject');
    const handleCancelFriendRequest = () => onFriendAction(user.userId, 'cancel');
    const handleUnfriend = () => onFriendAction(user.userId, 'unfriend');

    return (
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
                {user.status == DiscoverFriendStatus.Stranger ? (
                    <IconButton className="size-6" theme="success" onClick={handleSendFriendRequest} isLoading={!!executingActionType}>
                        <BsPersonPlus className="size-6"/>
                    </IconButton>
                ) : user.status == DiscoverFriendStatus.IncomingRequest ? (
                    <>
                        <IconButton className="size-6" theme="success" onClick={handleAcceptFriendRequest} isLoading={executingActionType == 'accept'} disabled={!!executingActionType}>
                            <BsPersonCheck className="size-6"/>
                        </IconButton>

                        <IconButton className="size-6" theme="danger" onClick={handleRejectFriendRequest} isLoading={executingActionType == 'reject'} disabled={!!executingActionType}>
                            <BsPersonX className="size-6"/>
                        </IconButton>
                    </>
                ) : user.status == DiscoverFriendStatus.OutcomingRequest ? (
                    <IconButton className="size-6" theme="danger" onClick={handleCancelFriendRequest} isLoading={!!executingActionType}>
                        <BsPersonX className="size-6"/>
                    </IconButton>
                ) : (
                    <IconButton className="size-6" theme="danger" onClick={handleUnfriend} isLoading={!!executingActionType}>
                        <BsPersonDash className="size-6"/>
                    </IconButton>
                )}

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <IconButton className="size-6" theme="default">
                            <BsThreeDotsVertical className="size-6"/>
                        </IconButton>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            className="min-w-50 rounded-lg bg-gray-600 p-1.5 shadow-lg text-white"
                            sideOffset={5}
                        >
                            <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                                Visit Profile
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                            {user.status == DiscoverFriendStatus.Stranger ? (
                                <DropdownMenu.Item
                                    className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                                    onSelect={handleSendFriendRequest}
                                    disabled={!!executingActionType}
                                >
                                    Send Friend Request
                                </DropdownMenu.Item>
                            ) : user.status == DiscoverFriendStatus.IncomingRequest ? (
                                <>
                                    <DropdownMenu.Item
                                        className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                                        onSelect={handleAcceptFriendRequest}
                                        disabled={!!executingActionType}
                                    >
                                        Accept Friend Request
                                    </DropdownMenu.Item>

                                    <DropdownMenu.Item
                                        className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm font-sans"
                                        onSelect={handleRejectFriendRequest}
                                        disabled={!!executingActionType}
                                    >
                                        Reject Friend Request
                                    </DropdownMenu.Item>
                                </>
                            ) : user.status == DiscoverFriendStatus.OutcomingRequest ? (
                                <DropdownMenu.Item
                                    className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                                    onSelect={handleCancelFriendRequest}
                                    disabled={!!executingActionType}
                                >
                                    Cancel Friend Request
                                </DropdownMenu.Item>
                            ) : (
                                <DropdownMenu.Item
                                    className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                                    onSelect={handleUnfriend}
                                    disabled={!!executingActionType}
                                >
                                    Unfriend
                                </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                            <DropdownMenu.Item
                                className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm text-red-400 font-semibold"
                            >
                                Block
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                                className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm text-red-400 font-semibold"
                            >
                                Report User
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
        </>
    );
}