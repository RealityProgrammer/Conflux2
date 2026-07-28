import {useDebounceValue} from "usehooks-ts";
import {BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useInfiniteQuery, useIsMutating, useMutation, useQueryClient} from "@tanstack/react-query";
import {
    type PaginatedResponse,
    type QueryFriendElement,
    type ServiceResponse
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import Spinner from "../../components/Spinner.tsx";
import {useGlobalEvent} from "../../hooks/useGlobalEvent.ts";
import type {UnfriendedNotification} from "../../api/notifications.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";

interface RowProps {
    element: QueryFriendElement;
    itemHeight: number;
    onUnfriended: (userId: string) => void;
}

export default function FriendListTabContent() {
    const ITEM_HEIGHT: number = 52;
    const PAGE_SIZE: number = 20;

    const queryClient = useQueryClient();
    const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

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
            ["queryFriends", userNameSearch],
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

    useGlobalEvent("lobby:unfriended", (notif: UnfriendedNotification) => {
        handleRemoveUserFromCache(notif.invokerUserId);
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

            <VirtualizedScrollList items={allElements}
                                   isLoading={isLoading}
                                   itemHeight={ITEM_HEIGHT}
                                   fetchNextPage={() => { fetchNextPage() }}
                                   hasNextPage={hasNextPage}
                                   isFetchingNextPage={isFetchingNextPage}
                                   renderItem={(item: QueryFriendElement) => (
                                       <ElementRow element={item}
                                                   itemHeight={ITEM_HEIGHT}
                                                   onUnfriended={handleRemoveUserFromCache}/>
                                   )}
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

function ElementRow({ element, itemHeight, onUnfriended }: RowProps) {
    const unfriendMutationKey = ["unfriend", element.userId];

    const unfriendMutation = useMutation({
        mutationKey: unfriendMutationKey,
        mutationFn: async () => {
            const response = await friendService.unfriend(element.userId);

            if (response.success) {
                onUnfriended(element.userId);
            }
        },
    });

    const activeUnfriendMutations = useIsMutating({ mutationKey: unfriendMutationKey });

    return (
        <UserNameplate.Root userId={element.userId}
                            userName={element.userName}
                            displayName={element.displayName}
                            hasAvatar={element.hasAvatar}
                            className="w-full p-1.5"
                            style={{
                                height: `${itemHeight}px`,
                            }}
        >
            <FriendActionButtons.Unfriend isExecuting={activeUnfriendMutations > 0}
                                          className="size-6"
                                          onClick={() => unfriendMutation.mutate()}/>

            <MoreActionsButton>
                <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                    Visit Profile
                </DropdownMenu.Item>

                <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                    Direct Message
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                <DropdownMenu.Item
                    className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm text-red-400 font-semibold"
                    disabled={activeUnfriendMutations > 0}
                    onSelect={() => unfriendMutation.mutate()}
                >
                    Unfriend
                </DropdownMenu.Item>

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