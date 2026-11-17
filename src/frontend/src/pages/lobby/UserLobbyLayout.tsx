import { NavLink, Outlet, useNavigate } from "react-router";
import { BsMegaphone, BsPeople } from "react-icons/bs";
import { Separator } from "radix-ui";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  DirectConversationUpdatedEvent,
  UserPresenceChangedEvent,
} from "../../api/events.ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import { UserNameplate } from "../../components/UserNameplate.tsx";
import {
  type GetDirectConversationsQuery,
  useInfiniteGetDirectConversationsQuery,
} from "../../graphql/infiniteQueries.ts";
import { useMentionCountStore } from "../../store/useMentionCountStore.ts";

export default function UserLobbyLayout() {
  return (
    <div className="flex size-full flex-row">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="bg-gray-725 flex h-full flex-none basis-64 flex-col overflow-hidden overflow-y-auto border-r-2 border-r-gray-600 px-1.5 pt-1.5 text-white">
      <section className="flex-none">
        <header className="mb-1.5 text-xs font-bold text-gray-400 uppercase">
          System
        </header>

        <NavLink
          to="/lobby/me/announcements"
          className={({ isActive }) =>
            `mb-1.5 flex flex-row items-center gap-2 rounded-md p-2 ${isActive ? "bg-white/8" : "hover-highlight"}`
          }
        >
          <BsMegaphone className="size-6 fill-white" />

          <span className="font-semibold">Announcements</span>
        </NavLink>

        <NavLink
          to="/lobby/me/friends"
          className={({ isActive }) =>
            `flex flex-row items-center gap-2 rounded-md p-2 ${isActive ? "bg-white/8" : "hover-highlight"}`
          }
        >
          <BsPeople className="size-6 fill-white" />

          <span className="font-semibold">Friends</span>
        </NavLink>
      </section>

      <Separator.Root
        orientation="horizontal"
        decorative
        className="my-2 h-px flex-none bg-gray-600"
      />

      <section className="flex min-h-0 flex-1 flex-col">
        <header className="mb-1.5 flex-none text-xs font-bold text-gray-400 uppercase">
          Direct Messages
        </header>

        <DirectMessagesList />
      </section>
    </aside>
  );
}

function DirectMessagesList() {
  const queryClient = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteGetDirectConversationsQuery(
      {},
      {
        initialPageParam: { after: null },
        getNextPageParam: (lastPage) => {
          const pageInfo = lastPage?.directConversations?.pageInfo;

          if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
            return { after: pageInfo.endCursor };
          }

          return undefined;
        },
        staleTime: 30 * 60 * 1000,
      },
    );

  const allElements =
    data?.pages.flatMap((page) => page?.directConversations.nodes ?? []) ?? [];

  useSignalREvent(
    "DirectConversationUpdated",
    async (event: DirectConversationUpdatedEvent) => {
      const hasConversation =
        data &&
        data.pages.some((page) => {
          return (
            page.directConversations.nodes?.some(
              (node) => node.id === event.conversationId,
            ) ?? false
          );
        });

      if (hasConversation) {
        queryClient.setQueryData<
          InfiniteData<GetDirectConversationsQuery, unknown> | undefined
        >(useInfiniteGetDirectConversationsQuery.getKey({}), (oldData) => {
          if (!oldData || oldData.pages.length === 0) return oldData;

          const newPages = oldData.pages.map((page) => ({
            ...page,
            directConversations: {
              ...page.directConversations,
              nodes: page.directConversations.nodes
                ? [...page.directConversations.nodes]
                : [],
            },
          }));

          let conversation:
            | NonNullable<
                GetDirectConversationsQuery["directConversations"]["nodes"]
              >[number]
            | undefined = undefined;

          // extract element
          for (const page of newPages) {
            if (!page.directConversations.nodes) continue;

            const index =
              page.directConversations.nodes.findIndex(
                (node) => node.id === event.conversationId,
              ) ?? -1;
            if (index === -1) continue;

            conversation = page.directConversations.nodes.splice(index, 1)[0];
            break;
          }

          if (!conversation) return oldData;
          newPages[0].directConversations.nodes!.unshift(conversation);

          return {
            ...oldData,
            pages: newPages,
          };
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: useInfiniteGetDirectConversationsQuery.getKey({}),
        });
      }
    },
  );

  useSignalREvent("PresenceUpdated", (event: UserPresenceChangedEvent) => {
    if (allElements.findIndex((e) => e.peerUser?.id === event.userId) === -1)
      return;

    queryClient.setQueryData<
      InfiniteData<GetDirectConversationsQuery, unknown>
    >(useInfiniteGetDirectConversationsQuery.getKey({}), (oldData) => {
      if (!oldData || !oldData.pages || oldData.pages.length == 0)
        return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          directMessageChannels: {
            ...page.directConversations,
            nodes: !page.directConversations.nodes
              ? null
              : page.directConversations.nodes.map((node) =>
                  node.peerUser?.id !== event.userId
                    ? node
                    : {
                        ...node,
                        peerUser: {
                          ...node.peerUser,
                          effectivePresenceStatus: event.status,
                        },
                      },
                ),
          },
        })),
      };
    });
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
        fetchNextPage();
      }}
      renderItem={(itemIndex) => {
        const item = allElements[itemIndex];

        return <DmNameplate dm={item} />;
      }}
    />
  );
}

function DmNameplate({
  dm,
}: {
  dm: NonNullable<
    GetDirectConversationsQuery["directConversations"]["nodes"]
  >[number];
}) {
  const navigate = useNavigate();

  const mentionCount = useMentionCountStore(
    (state) => state.dmMentions[dm.peerUser?.id!] || 0,
  );

  return (
    <UserNameplate.Root
      userId={dm.peerUser!.id}
      avatarVersion={dm.peerUser?.avatarVersion}
      displayName={dm.peerUser?.displayName ?? "???"}
      className="hover-highlight w-full cursor-pointer rounded-md p-1.5"
      presence={
        dm.peerUser?.effectivePresenceStatus
          ? {
              status: dm.peerUser.effectivePresenceStatus,
              className: "size-4 border-2 border-gray-725 bg-gray-725",
            }
          : undefined
      }
      onClick={() => {
        const otherUserId = dm.peerUser?.id;
        if (!otherUserId) return;

        navigate(`/lobby/me/dm/${encodeURIComponent(otherUserId)}`);
      }}
    >
      {mentionCount > 0 ? (
        <span className="flex-none rounded-lg bg-red-500 px-1 py-0.5 text-xs font-bold text-white">
          {mentionCount}
        </span>
      ) : null}
    </UserNameplate.Root>
  );
}
