import {NavLink, Outlet, useNavigate} from "react-router";
import {BsMegaphone, BsPeople} from "react-icons/bs";
import {Separator} from "radix-ui";
import {useFetchDmChannelSummary} from "../../hooks/fetchDmChannelSummary.ts";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import type {DmConversationListItemDto, PaginatedResponse, ServiceResponse} from "../../api/responses.ts";
import {sessionUserService} from "../../api/sessionUserService.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {UpdateDmConversationListEvent} from "../../api/events.ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import {UserNameplate} from "../../components/UserNameplate.tsx";

export default function UserLobbyLayout() {
  return (
    <div className="size-full flex flex-row">
      <Sidebar/>

      <div className="flex-1 overflow-auto">
        <Outlet/>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside
      className="flex-none basis-64 px-1.5 pt-1.5 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-y-auto flex flex-col overflow-hidden">
      <section className="flex-none">
        <header className="text-xs mb-1.5 font-bold text-gray-400 uppercase">System</header>

        <NavLink to="/lobby/me/announcements"
                 className={({isActive}) => `mb-1.5 p-2 rounded-md flex flex-row gap-2 items-center ${isActive ? 'bg-white/8' : 'hover-highlight'}`}>
          <BsMegaphone className="size-6 fill-white"/>

          <span className="font-semibold">Announcements</span>
        </NavLink>

        <NavLink to="/lobby/me/friends"
                 className={({isActive}) => `p-2 rounded-md flex flex-row gap-2 items-center ${isActive ? 'bg-white/8' : 'hover-highlight'}`}>
          <BsPeople className="size-6 fill-white"/>

          <span className="font-semibold">Friends</span>
        </NavLink>
      </section>

      <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-2 flex-none"/>

      <section className="flex-1 flex flex-col min-h-0">
        <header className="text-xs mb-1.5 font-bold text-gray-400 uppercase flex-none">Direct Messages</header>

        <DirectMessagesList/>
      </section>
    </aside>
  );
}

function DirectMessagesList() {
  const navigate = useNavigate();

  const queryKey = ["dmConversations"];

  const getDmChannelSummary = useFetchDmChannelSummary();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({pageParam = 0}): Promise<PaginatedResponse<DmConversationListItemDto> | null | undefined> => {
      const response: ServiceResponse<PaginatedResponse<DmConversationListItemDto>> =
        await sessionUserService.getDmConversations(pageParam, 30);

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
    const dmChannelSummary = await getDmChannelSummary(event.channelId);

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
      fetchNextPage={() => {
        fetchNextPage()
      }}
      renderItem={(itemIndex) => {
        const item = allElements[itemIndex];

        return (
          <UserNameplate.Root
            userId={item.userProfile.id}
            displayName={item.userProfile.displayName ?? "???"}
            hasAvatar={item.userProfile.hasAvatar}
            className="w-full p-1.5 hover-highlight rounded-md cursor-pointer"
            onClick={() => {
              navigate("/lobby/me/dm/" + item.userProfile.id);
            }}
          />
        );
      }}
    />
  );
}