import {useDebounceValue} from "usehooks-ts";
import {BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {useInfiniteQuery} from "@tanstack/react-query";
import {
    type PaginatedResponse,
    type QueryPendingRequestElement,
    type ServiceResponse,
    UserRelationshipStatus
} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import Spinner from "../../components/Spinner.tsx";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";

interface RowProps {
    element: QueryPendingRequestElement;
    itemHeight: number;
}

export default function PendingRequestsTabContent() {
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
        queryKey: ["queryFriends", userNameSearch],
        queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse<QueryPendingRequestElement> | null | undefined> => {
            const response: ServiceResponse<PaginatedResponse<QueryPendingRequestElement>> =
                await friendService.queryPendingRequests(userNameSearch, pageParam, PAGE_SIZE);

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
                                   renderItem={(item: QueryPendingRequestElement) => (
                                       <ElementRow element={item} itemHeight={ITEM_HEIGHT}/>
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

function ElementRow({ element, itemHeight }: RowProps) {
    return (
        <UserNameplate.Root userId={element.userId}
                            userName={element.userName}
                            displayName={element.displayName}
                            hasAvatar={element.hasAvatar}
                            className="w-full"
                            style={{
                                height: `${itemHeight}px`,
                            }}
        >
            <MoreActionsButton>
                <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                    Visit Profile
                </DropdownMenu.Item>

                <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                    Direct Message
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                {element.status === UserRelationshipStatus.IncomingRequest ? (
                    <>
                        <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                            Reject Request
                        </DropdownMenu.Item>

                        <DropdownMenu.Item className="group relative flex p-2 select-none items-center rounded-sm leading-none text-violet11 outline-none button-cursor hover-highlight text-sm">
                            Accept Request
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>
                    </>
                ) : element.status === UserRelationshipStatus.OutcomingRequest && (
                    <>
                        <DropdownMenu.Item
                            className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm text-red-400 font-semibold"
                        >
                            Cancel Request
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>
                    </>
                )}

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