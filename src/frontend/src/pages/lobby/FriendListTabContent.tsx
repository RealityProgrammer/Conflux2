import {useDebounceValue} from "usehooks-ts";
import {BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {
    type PaginatedResponse,
    type QueryFriendElement, type QueryPendingRequestElement,
    type ServiceResponse, UserRelationshipStatus
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import Spinner from "../../components/Spinner.tsx";
import {useGlobalEvent} from "../../hooks/useGlobalEvent.ts";
import type {FriendRequestAcceptedNotification, UnfriendedNotification} from "../../api/notifications.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useFriendActions from "../../hooks/useFriendActions.tsx";
import {useCacheService} from "../../hooks/useCacheService.ts";

const ITEM_HEIGHT: number = 52;

interface RowProps {
    element: QueryFriendElement;
    removeUserFromCache: (userId: string) => void;
}

export default function FriendListTabContent() {
    const PAGE_SIZE: number = 20;

    const queryClient = useQueryClient();
    const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

    const queryKey = ["queryFriends", userNameSearch];

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: queryKey,
        queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse<QueryFriendElement> | null | undefined> => {
            const response: ServiceResponse<PaginatedResponse<QueryFriendElement>> =
                await friendService.queryFriends(userNameSearch, pageParam, PAGE_SIZE);

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

    const handleRemoveUserFromCache = (userId: string) => {
        queryClient.setQueryData<InfiniteData<PaginatedResponse<QueryFriendElement>>>(
            queryKey,
            (oldData) => {
                if (!oldData) return oldData;

                const elementExists = oldData.pages.some(page =>
                    page?.elements.some(element => element.userId === userId)
                );

                if (!elementExists) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => {
                        if (!page) return page;

                        const filteredElements = page.elements.filter(
                            (element) => element.userId !== userId
                        );

                        const removedCount = page.elements.length - filteredElements.length;

                        return {
                            ...page,
                            elements: filteredElements,
                            totalCount: page.totalCount - removedCount,
                        };
                    }),
                };
            }
        );
    };

    const { fetchUserBasicProfile } = useCacheService();

    useGlobalEvent("lobby:unfriended", (notif: UnfriendedNotification) => {
        handleRemoveUserFromCache(notif.invokerUserId);
    });

    useGlobalEvent("lobby:friendRequestAccepted", async (notif: FriendRequestAcceptedNotification) => {
        const profileResponse = await fetchUserBasicProfile(notif.acceptorUserId);

        if (!profileResponse.success) return;

        const userProfile = profileResponse.data!;

        const newElement: QueryPendingRequestElement = {
            userId: notif.acceptorUserId,
            userName: userProfile.userName,
            displayName: userProfile.displayName,
            hasAvatar: userProfile.hasAvatar,
            status: UserRelationshipStatus.IncomingRequest,
        }

        queryClient.setQueryData<InfiniteData<PaginatedResponse<QueryPendingRequestElement>>>(
            queryKey,
            (oldData) => {
                if (!oldData || oldData.pages.length === 0) return oldData;

                const alreadyExists = oldData.pages.some(page =>
                    page?.elements.some(el => el.userId === notif.acceptorUserId)
                );

                if (alreadyExists) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page, index) => {
                        if (!page) return page;

                        const updatedElements = index === 0
                            ? [newElement, ...page.elements]
                            : page.elements;

                        return {
                            ...page,
                            elements: updatedElements,
                            totalCount: page.totalCount + 1,
                        };
                    }),
                };
            }
        );
    });

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

            <VirtualizedScrollList
                items={allElements}
                isLoading={isLoading}
                itemHeight={ITEM_HEIGHT}
                fetchNextPage={() => { fetchNextPage() }}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                renderItem={(item: QueryFriendElement) =>
                    <Row element={item}
                         removeUserFromCache={() => handleRemoveUserFromCache(item.userId)}/>
                }
                renderSkeletonItem={(index) => (
                    <UserNameplate.Skeleton key={index}
                                            className="p-1.5"
                                            style={{ height: `${ITEM_HEIGHT}px` }}/>
                )}
                renderFetchingNext={() => (
                    <Spinner className="fill-white size-6 align-middle"/>
                )}/>
        </div>
    );
}

function Row({ element, removeUserFromCache }: RowProps) {
    const { mutation, activeAction } = useFriendActions(element.userId);

    const handleUnfriend = () => mutation.mutate('unfriend', {
        onSuccess: (response: ServiceResponse) => {
            if (response.success) {
                removeUserFromCache(element.userId)
            }
        }
    });

    return (
        <UserNameplate.Root userId={element.userId}
                            userName={element.userName}
                            displayName={element.displayName}
                            hasAvatar={element.hasAvatar}
                            className="w-full p-1.5"
                            style={{ height: `${ITEM_HEIGHT}px` }}
        >
            <FriendActionButtons.Unfriend isExecuting={!!activeAction} className="size-6" onClick={handleUnfriend}/>

            <MoreActionsButton>
                <DropdownMenu.Item className="dropdown-item-default">
                    Visit Profile
                </DropdownMenu.Item>

                <DropdownMenu.Item className="dropdown-item-default">
                    Direct Message
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                <DropdownMenu.Item className="dropdown-item-danger" disabled={!!activeAction} onSelect={handleUnfriend}>
                    Unfriend
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                <DropdownMenu.Item className="dropdown-item-danger">
                    Block
                </DropdownMenu.Item>

                <DropdownMenu.Item className="dropdown-item-danger">
                    Report User
                </DropdownMenu.Item>
            </MoreActionsButton>
        </UserNameplate.Root>
    );
}