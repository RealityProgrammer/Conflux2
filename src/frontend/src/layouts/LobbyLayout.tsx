import { useAuthorization } from "../contexts/AuthContext.tsx";
import {Avatar, Separator, Tooltip} from "radix-ui";
import {NavLink, Outlet, useLocation, useNavigate} from "react-router";
import {BsMegaphone, BsPeople, BsPerson} from "react-icons/bs";
import {useVirtualizer} from "@tanstack/react-virtual";
import {useRef} from "react";
import UserAvatar from "../components/UserAvatar.tsx";
import {useDocumentTitle} from "usehooks-ts";
import VirtualizedScrollList from "../components/VirtualizedScrollList.tsx";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import type {
    DmConversationListItemDto,
    PaginatedResponse,
    ServiceResponse,
    UserIdentityProfileDto
} from "../api/responses.ts";
import {friendService} from "../api/friendService.ts";
import {channelService} from "../api/channelService.ts";
import {UserNameplate} from "../components/UserNameplate.tsx";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import {useCacheService} from "../hooks/useCacheService.ts";
import type {UpdateDmConversationListEvent} from "../api/events.ts";

function Sidebar() {
    const auth = useAuthorization();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="flex-none flex flex-col px-1.5 gap-1 h-full bg-gray-775 border-r-2 border-r-gray-600">
            <Tooltip.Provider delayDuration={500}>
                <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                        <UserAvatar
                            userId={auth.userAuthorization?.id}
                            hasAvatar={auth.userProfile?.hasAvatar ?? false}
                            className="mt-1.5 flex-none size-12 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer scale-100 hover:scale-110 transition-transform duration-200 ease-linear"
                            onClick={() => {
                                if (location.pathname !== "/lobby") {
                                    navigate("/lobby");
                                }
                            }}/>
                    </Tooltip.Trigger>

                    <Tooltip.Portal>
                        <Tooltip.Content side="right" sideOffset={5} className="select-none rounded-lg bg-gray-500">
                            <p className="text-white font-semibold px-3 py-1">To your private space</p>

                            <Tooltip.Arrow className="fill-gray-500" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-1.5"/>

            <div className="flex-1 h-full">
            </div>
        </nav>
    );
}

function DirectMessagesList() {
    const navigate = useNavigate();

    const queryKey = ["dmConversations"];

    const cacheService = useCacheService();
    const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: queryKey,
        queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse<DmConversationListItemDto> | null | undefined> => {
            const response: ServiceResponse<PaginatedResponse<DmConversationListItemDto>> =
                await channelService.getDmConversations(pageParam, 30);

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

    useSignalREvent("UpdateDmConversationList", async (event: UpdateDmConversationListEvent) => {
        const dmChannelSummary = await cacheService.getDmChannelSummary(event.channelId);

        queryClient.setQueryData<InfiniteData<PaginatedResponse<DmConversationListItemDto> | undefined | null>>(
            queryKey,
            (oldData) => {
                if (!oldData || oldData.pages.length === 0) {
                    return oldData;
                }

                const updatedPages = oldData.pages.map((page: PaginatedResponse<DmConversationListItemDto> | null | undefined) => ({
                    ...page!,
                    elements: page!.elements.filter(item => item.channelId !== event.channelId)
                }));

                const updatedChannel = {
                    channelId: event.channelId,
                    userProfile: dmChannelSummary.data!.otherUser,
                };

                updatedPages[0] = {
                    ...updatedPages[0],
                    elements: [updatedChannel, ...updatedPages[0].elements],
                };

                return {
                    ...oldData,
                    pages: updatedPages,
                };
            }
        );
    });

    return (
        <VirtualizedScrollList
            className="flex-1"
            itemCount={allElements.length}
            isLoading={isLoading}
            estimateSize={() => 44}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={() => { fetchNextPage() }}
            renderItem={(itemIndex, virtualItem) => {
                const item = allElements[itemIndex];

                return (
                    <UserNameplate.Root
                        userId={item.userProfile.id}
                        displayName={item.userProfile.displayName}
                        hasAvatar={item.userProfile.hasAvatar}
                        className="w-full p-1.5 hover-highlight rounded-md cursor-pointer"
                        onClick={() => {
                            navigate("/lobby/dm/" + item.userProfile.id);
                        }}
                    />
                );
            }}
        />
    );
}

function LocationSidebar() {
    return (
        <nav className="flex-none basis-64 px-1.5 pt-1.5 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-y-auto flex flex-col overflow-hidden">
            <section className="flex-none">
                <header className="text-xs mb-1.5 font-bold text-gray-400 uppercase">System</header>

                <NavLink to="/lobby/announcements" className={({ isActive }) => `mb-1.5 p-2 rounded-md flex flex-row gap-2 items-center ${isActive ? 'bg-white/8' : 'hover-highlight'}`}>
                    <BsMegaphone className="size-6 fill-white"/>

                    <span className="font-semibold">Announcements</span>
                </NavLink>

                <NavLink to="/lobby/friends" className={({ isActive }) => `p-2 rounded-md flex flex-row gap-2 items-center ${isActive ? 'bg-white/8' : 'hover-highlight'}`}>
                    <BsPeople className="size-6 fill-white"/>

                    <span className="font-semibold">Friends</span>
                </NavLink>
            </section>

            <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-2 flex-none"/>

            <section className="flex-1 flex flex-col min-h-0">
                <header className="text-xs mb-1.5 font-bold text-gray-400 uppercase flex-none">Direct Messages</header>

                <DirectMessagesList/>
            </section>
        </nav>
    );
}

export default function LobbyLayout() {
    useDocumentTitle("Lobby - Conflux");

    return (
        <div className="h-dvh w-dvw overflow-hidden flex flex-row">
            <Sidebar/>
            <LocationSidebar/>

            <section className="flex-1 overflow-auto">
                <Outlet/>
            </section>
        </div>
    );
}