import {useState} from "react";
import {useDebounceValue} from "usehooks-ts";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {
    type DiscoverFriendElement,
    type PaginatedResponse,
    UserRelationshipStatus,
    type SendFriendRequestResponse,
    SendFriendRequestResult,
    type ServiceResponse
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
import {BsPersonCheck, BsPersonDash, BsPersonPlus, BsPersonX} from "react-icons/bs";
import IconButton from "../../components/IconButton.tsx";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import Spinner from "../../components/Spinner.tsx";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";

type FriendActionType = 'send' | 'accept' | 'reject' | 'cancel' | 'unfriend';

interface SearchResultRowProps {
    user: DiscoverFriendElement;
    onFriendAction: (userId: string, actionType: FriendActionType) => Promise<void>;
    executingActionType: FriendActionType | null;
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

    const [executingActions, setExecutingActions] = useState<Map<string, FriendActionType>>(new Map<string, FriendActionType>());
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

    const handleAction = async (userId: string, actionType: FriendActionType) => {
        setExecutingActions(prev => new Map(prev).set(userId, actionType));
        try {
            let success = false;
            let targetStatus = UserRelationshipStatus.Stranger;

            switch (actionType) {
                case 'send': {
                    const response: ServiceResponse<SendFriendRequestResponse> =
                        await friendService.sendFriendRequest(userId);

                    success = response.success;

                    if (success && response.data) {
                        targetStatus = response.data.result === SendFriendRequestResult.Friended
                            ? UserRelationshipStatus.Friended
                            : UserRelationshipStatus.OutcomingRequest;
                    }
                    break;
                }

                case 'accept':
                    success = (await friendService.acceptFriendRequest(userId)).success;
                    targetStatus = UserRelationshipStatus.Friended;
                    break;

                case 'reject':
                    success = (await friendService.rejectFriendRequest(userId)).success;
                    targetStatus = UserRelationshipStatus.Stranger; // Or whatever your UI expects
                    break;

                case 'cancel':
                    success = (await friendService.cancelFriendRequest(userId)).success;
                    targetStatus = UserRelationshipStatus.Stranger;
                    break;

                case 'unfriend':
                    success = (await friendService.unfriend(userId)).success;
                    targetStatus = UserRelationshipStatus.Stranger;
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

            <VirtualizedScrollList items={allElements}
                                   isLoading={isLoading}
                                   itemHeight={ITEM_HEIGHT}
                                   fetchNextPage={() => { fetchNextPage() }}
                                   hasNextPage={hasNextPage}
                                   isFetchingNextPage={isFetchingNextPage}
                                   renderItem={(item) => (
                                       <ElementRow
                                           user={item}
                                           onFriendAction={handleAction}
                                           executingActionType={executingActions.get(item.userId) ?? null}/>
                                   )}
                                   renderSkeletonItem={(index) =>
                                       <UserNameplate.Skeleton key={index}
                                                               className="p-1.5"
                                                               style={{ height: `${ITEM_HEIGHT}px` }}/>
                                   }
                                   renderFetchingNext={() =>
                                       <Spinner className="fill-white size-6 align-middle"/>
                                   }
            />
        </div>
    );
}

function ElementRow({ user, onFriendAction, executingActionType }: SearchResultRowProps) {
    const handleSendFriendRequest = () => onFriendAction(user.userId, 'send');
    const handleAcceptFriendRequest = () => onFriendAction(user.userId, 'accept');
    const handleRejectFriendRequest = () => onFriendAction(user.userId, 'reject');
    const handleCancelFriendRequest = () => onFriendAction(user.userId, 'cancel');
    const handleUnfriend = () => onFriendAction(user.userId, 'unfriend');

    return (
        <UserNameplate.Root userId={user.userId}
                            userName={user.userName}
                            displayName={user.displayName}
                            hasAvatar={user.hasAvatar}
                            className="w-full p-1.5"
        >
            {user.status == UserRelationshipStatus.Stranger ? (
                <IconButton className="size-6" theme="success" onClick={handleSendFriendRequest} isLoading={!!executingActionType}>
                    <BsPersonPlus className="size-6"/>
                </IconButton>
            ) : user.status == UserRelationshipStatus.IncomingRequest ? (
                <>
                    <IconButton className="size-6" theme="success" onClick={handleAcceptFriendRequest} isLoading={executingActionType == 'accept'} disabled={!!executingActionType}>
                        <BsPersonCheck className="size-6"/>
                    </IconButton>

                    <IconButton className="size-6" theme="danger" onClick={handleRejectFriendRequest} isLoading={executingActionType == 'reject'} disabled={!!executingActionType}>
                        <BsPersonX className="size-6"/>
                    </IconButton>
                </>
            ) : user.status == UserRelationshipStatus.OutcomingRequest ? (
                <IconButton className="size-6" theme="danger" onClick={handleCancelFriendRequest} isLoading={!!executingActionType}>
                    <BsPersonX className="size-6"/>
                </IconButton>
            ) : (
                <FriendActionButtons.Unfriend isExecuting={!!executingActionType}
                                              className="size-6"
                                              onClick={handleUnfriend}/>
            )}

            <MoreActionsButton>
                <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                    Visit Profile
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                {user.status == UserRelationshipStatus.Stranger ? (
                    <DropdownMenu.Item
                        className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
                        onSelect={handleSendFriendRequest}
                        disabled={!!executingActionType}
                    >
                        Send Friend Request
                    </DropdownMenu.Item>
                ) : user.status == UserRelationshipStatus.IncomingRequest ? (
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
                ) : user.status == UserRelationshipStatus.OutcomingRequest ? (
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
            </MoreActionsButton>
        </UserNameplate.Root>
    );
}