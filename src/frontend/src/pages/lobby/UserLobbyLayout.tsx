import {NavLink, Outlet, useNavigate} from "react-router";
import {BsMegaphone, BsPeople} from "react-icons/bs";
import {Separator} from "radix-ui";
import {type InfiniteData, useQueryClient} from "@tanstack/react-query";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {UpdateDmConversationListEvent, UserPresenceChangedEvent} from "../../api/events.ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import {
  type GetDirectMessageChannelsQuery,
  useInfiniteGetDirectMessageChannelsQuery
} from "../../graphql/infiniteQueries.ts";

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

  // const getDmChannelSummary = useFetchDmChannelSummary();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteGetDirectMessageChannelsQuery(
    {},
    {
      initialPageParam: { after: null },
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.directMessageChannels?.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      staleTime: 30 * 60 * 1000,
    }
  );

  const allElements = data?.pages.flatMap((page) => page?.directMessageChannels.nodes ?? []) ?? [];

  useSignalREvent("UpdateDmConversationList", async (event: UpdateDmConversationListEvent): Promise<void> => {
    if (!allElements || allElements.length == 0 || allElements[0].id === event.channelId) return;

    queryClient.invalidateQueries({
      queryKey: useInfiniteGetDirectMessageChannelsQuery.getKey({}),
    })
  });

  useSignalREvent("PresenceUpdated", (event: UserPresenceChangedEvent) => {
    console.log("PresenceUpdated user", event.userId, "to status", event.status);

    if (allElements.findIndex(e => e.friendRequest!.otherUser!.id) === -1) return;

    queryClient.setQueryData<InfiniteData<GetDirectMessageChannelsQuery, unknown>>(
      useInfiniteGetDirectMessageChannelsQuery.getKey({}),
      (oldData) => {
        if (!oldData || !oldData.pages || oldData.pages.length == 0) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            directMessageChannels: {
              ...page.directMessageChannels,
              nodes: !page.directMessageChannels.nodes ?
                null :
                page.directMessageChannels.nodes.map(node =>
                  node.friendRequest?.otherUser?.id !== event.userId ?
                    node :
                    {
                      ...node,
                      friendRequest: {
                        ...node.friendRequest,
                        otherUser: {
                          ...node.friendRequest.otherUser,
                          effectivePresenceStatus: event.status,
                        }
                      },
                    },
                ),
            }
          })),
        }
      }
    )
  });

  return (
    <VirtualizedScrollList
      className="flex-1"
      keyExtractor={(index) => allElements[index].id}
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
            userId={item.friendRequest?.otherUser?.id ?? ""}
            displayName={item.friendRequest?.otherUser?.displayName ?? "???"}
            hasAvatar={item.friendRequest?.otherUser?.hasAvatar}
            className="w-full p-1.5 hover-highlight rounded-md cursor-pointer"
            presenceStatus={item.friendRequest!.otherUser!.effectivePresenceStatus}
            presenceStatusCutoff="ring-2 ring-gray-725"
            onClick={() => {
              const otherUserId = item.friendRequest?.otherUser?.id;
              if (!otherUserId) return;

              navigate(`/lobby/me/dm/${encodeURIComponent(otherUserId)}`);
            }}
          />
        );
      }}
    />
  );
}