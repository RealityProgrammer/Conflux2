import {useDebounceValue} from "usehooks-ts";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {
    type DiscoverFriendElement,
    type PaginatedResponse,
    type SendFriendRequestResponse,
    type ServiceResponse,
    UserRelationshipStatus
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import {useGlobalEvent} from "../../hooks/useGlobalEvent.ts";
import type {
    FriendRequestAcceptedNotification,
    FriendRequestCanceledNotification,
    FriendRequestReceivedNotification,
    FriendRequestRejectedNotification,
    UnfriendedNotification
} from "../../api/notifications.ts";
import {DropdownMenu} from "radix-ui";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import Spinner from "../../components/Spinner.tsx";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useFriendActions from "../../hooks/useFriendActions.tsx";

interface RowProps {
    user: DiscoverFriendElement;
    updateCacheStatus: (userId: string, newStatus: UserRelationshipStatus) => void;
}

export default function AddFriendTabContent() {
    const ITEM_HEIGHT: number = 52;
    const PAGE_SIZE: number = 20;

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
        queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse<DiscoverFriendElement> | null | undefined> => {
            const response: ServiceResponse<PaginatedResponse<DiscoverFriendElement>> =
                await friendService.discover(userNameSearch, pageParam, PAGE_SIZE);

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

    const queryClient = useQueryClient();

    const updateCacheStatus = (userId: string, newStatus: UserRelationshipStatus) => {
        queryClient.setQueryData<InfiniteData<PaginatedResponse<DiscoverFriendElement>>>(
            ["discoverUsers", userNameSearch],
            (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        elements: page.elements.map(user => {
                            return user.userId === userId ? {...user, status: newStatus} : user;
                        })
                    }))
                };
            }
        );
    };

    // handle realtime modification
    useGlobalEvent("lobby:friendRequestReceived", (notif: FriendRequestReceivedNotification) => {
        updateCacheStatus(notif.senderUserId, UserRelationshipStatus.IncomingRequest);
    });

    useGlobalEvent("lobby:friendRequestCanceled", (notif: FriendRequestCanceledNotification) => {
        updateCacheStatus(notif.senderUserId, UserRelationshipStatus.Stranger);
    });

    useGlobalEvent("lobby:friendRequestAccepted", (notif: FriendRequestAcceptedNotification) => {
        updateCacheStatus(notif.acceptorUserId, UserRelationshipStatus.Friended);
    });

    useGlobalEvent("lobby:friendRequestRejected", (notif: FriendRequestRejectedNotification) => {
        updateCacheStatus(notif.rejecterUserId, UserRelationshipStatus.Stranger);
    });

    useGlobalEvent("lobby:unfriended", (notif: UnfriendedNotification) => {
        updateCacheStatus(notif.invokerUserId, UserRelationshipStatus.Stranger);
    });

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

            <VirtualizedScrollList
                className="flex-1"
                viewportClassName="rounded-md border-2 border-gray-600"
                items={allElements}
                isLoading={isLoading}
                estimateSize={ITEM_HEIGHT}
                fetchNextPage={() => { fetchNextPage() }}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                renderEmpty={() => (
                    <div className="flex flex-1 select-none items-center justify-center text-gray-400">
                        No items found.
                    </div>
                )}
                renderItem={(item) => (
                    <Row user={item} updateCacheStatus={updateCacheStatus}/>
                )}
                renderSkeletonItem={(index) =>
                    <UserNameplate.Skeleton key={index}
                                            className="p-1.5"
                                            style={{ height: `${ITEM_HEIGHT}px` }}/>
                }
                renderFetchingNext={() => (
                    <div
                        className="flex w-full items-center justify-center"
                        style={{ height: `${ITEM_HEIGHT}px` }}
                    >
                        <Spinner className="size-6 fill-white align-middle" />
                    </div>
                )}
            />
        </div>
    );
}

function Row({ user, updateCacheStatus }: RowProps) {
    const { mutation, activeAction } = useFriendActions(user.userId);

    const handleSendFriendRequest = () => mutation.mutate('send', {
        onSuccess: (response: ServiceResponse<SendFriendRequestResponse>) => {
            if (response && response.success && response.data) {
                updateCacheStatus(user.userId, response.data.status);
            }
        },
    });
    const handleAcceptFriendRequest = () => mutation.mutate('accept', {
        onSuccess: (response: ServiceResponse) => {
            if (response && response.success) {
                updateCacheStatus(user.userId, UserRelationshipStatus.Friended);
            }
        }
    });
    const handleRejectFriendRequest = () => mutation.mutate('reject', {
        onSuccess: (response: ServiceResponse) => {
            if (response && response.success) {
                updateCacheStatus(user.userId, UserRelationshipStatus.Stranger);
            }
        }
    });
    const handleCancelFriendRequest = () => mutation.mutate('cancel', {
        onSuccess: (response: ServiceResponse) => {
            if (response && response.success) {
                updateCacheStatus(user.userId, UserRelationshipStatus.Stranger);
            }
        }
    });
    const handleUnfriend = () => mutation.mutate('unfriend', {
        onSuccess: (response: ServiceResponse) => {
            if (response && response.success) {
                updateCacheStatus(user.userId, UserRelationshipStatus.Stranger);
            }
        }
    });

    return (
        <UserNameplate.Root userId={user.userId}
                            userName={user.userName}
                            displayName={user.displayName}
                            hasAvatar={user.hasAvatar}
                            className="w-full p-1.5"
        >
            {user.status == UserRelationshipStatus.Stranger ? (
                <FriendActionButtons.Send
                    isExecuting={activeAction == 'send'}
                    onClick={handleSendFriendRequest}
                    className="size-6"/>
            ) : user.status == UserRelationshipStatus.IncomingRequest ? (
                <>
                    <FriendActionButtons.Reject
                        isExecuting={activeAction == 'reject'}
                        onClick={handleRejectFriendRequest}
                        className="size-6"/>

                    <FriendActionButtons.Accept
                        isExecuting={activeAction == 'accept'}
                        onClick={handleAcceptFriendRequest}
                        className="size-6"/>
                </>
            ) : user.status == UserRelationshipStatus.OutcomingRequest ? (
                <FriendActionButtons.Cancel
                    isExecuting={activeAction == 'cancel'}
                    onClick={handleCancelFriendRequest}
                    className="size-6"/>
            ) : (
                <FriendActionButtons.Unfriend
                    isExecuting={activeAction == 'unfriend'}
                    className="size-6"
                    onClick={handleUnfriend}/>
            )}

            <MoreActionsButton>
                <DropdownMenu.Item className="dropdown-item-default">
                    Visit Profile
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                {user.status == UserRelationshipStatus.Stranger ? (
                    <DropdownMenu.Item
                        className="dropdown-item-default"
                        onSelect={handleSendFriendRequest}
                    >
                        Send Friend Request
                    </DropdownMenu.Item>
                ) : user.status == UserRelationshipStatus.IncomingRequest ? (
                    <>
                        <DropdownMenu.Item
                            className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                            onSelect={handleAcceptFriendRequest}
                            disabled={!!activeAction}
                        >
                            Accept Friend Request
                        </DropdownMenu.Item>

                        <DropdownMenu.Item
                            className="dropdown-item-danger"
                            onSelect={handleRejectFriendRequest}
                            disabled={!!activeAction}
                        >
                            Reject Friend Request
                        </DropdownMenu.Item>
                    </>
                ) : user.status == UserRelationshipStatus.OutcomingRequest ? (
                    <DropdownMenu.Item
                        className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                        onSelect={handleCancelFriendRequest}
                        disabled={!!activeAction}
                    >
                        Cancel Friend Request
                    </DropdownMenu.Item>
                ) : (
                    <DropdownMenu.Item
                        className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                        onSelect={handleUnfriend}
                        disabled={!!activeAction}
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
            </MoreActionsButton>
        </UserNameplate.Root>
    );
}