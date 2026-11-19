import { DropdownMenu } from "radix-ui";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { UserNameplate } from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import type {
  FriendRequestAcceptedEvent,
  FriendRequestCanceledEvent,
  FriendRequestReceivedEvent,
  FriendRequestRejectedEvent,
} from "../../api/events.ts";
import { FriendActionButtons } from "../../components/FriendActionButtons.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";
import {
  type GetPendingFriendRequestsQuery,
  useInfiniteGetPendingFriendRequestsQuery,
} from "../../graphql/infiniteQueries.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { toast } from "react-toastify";

export default function PendingRequestsTabContent() {
  const queryClient = useQueryClient();

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } =
    useInfiniteGetPendingFriendRequestsQuery(
      { after: null },
      {
        initialPageParam: { after: null },
        getNextPageParam: (lastPage: GetPendingFriendRequestsQuery) => {
          const pageInfo = lastPage?.friendRequests?.pageInfo;

          if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
            return { after: pageInfo.endCursor };
          }

          return undefined;
        },
      },
    );

  const allElements = data?.pages.flatMap((page) => page?.friendRequests.nodes ?? []) ?? [];

  const removeCacheElement = (requestId: string) => {
    queryClient.setQueryData<InfiniteData<GetPendingFriendRequestsQuery>>(
      useInfiniteGetPendingFriendRequestsQuery.getKey({ after: null }),
      (oldData) => {
        if (!oldData || oldData.pages.length === 0) return oldData;

        const elementExists = oldData.pages.some((page) =>
          page?.friendRequests.nodes!.some((element) => element.id === requestId),
        );

        if (!elementExists) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            friendRequests: {
              ...page.friendRequests,
              nodes: page.friendRequests.nodes
                ? page.friendRequests.nodes.filter((n) => n.id !== requestId)
                : page.friendRequests.nodes,
            },
          })),
        };
      },
    );
  };

  useSignalREvent("FriendRequestReceived", async (_event: FriendRequestReceivedEvent) => {
    queryClient.invalidateQueries({
      queryKey: useInfiniteGetPendingFriendRequestsQuery.getKey({}),
    });
  });

  useSignalREvent("FriendRequestRejected", (event: FriendRequestRejectedEvent) => {
    removeCacheElement(event.requestId);
  });

  useSignalREvent("FriendRequestAccepted", (event: FriendRequestAcceptedEvent) => {
    removeCacheElement(event.requestId);
  });

  useSignalREvent("FriendRequestCanceled", (event: FriendRequestCanceledEvent) => {
    removeCacheElement(event.requestId);
  });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex-1 overflow-hidden rounded-md border-2 border-gray-600">
        {isLoading ? (
          <>
            {Array.from({ length: 20 }).map((_, index) => (
              <UserNameplate.Skeleton key={index} className="p-1.5" />
            ))}
          </>
        ) : (
          <VirtualizedScrollList2
            totalCount={allElements.length}
            computeItemKey={(index) => allElements[index].id}
            atBottomThreshold={120}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage && !isLoading) {
                fetchNextPage();
              }
            }}
            overscan={10}
            renderItem={(index) => {
              return <Row element={allElements[index]} removeCacheElement={removeCacheElement} />;
            }}
            renderEmpty={() => (
              <div className="flex size-full flex-row items-center justify-center text-gray-500">
                <span className="select-none">There is nothing here...</span>
              </div>
            )}
            showBottomLoader={isFetchingNextPage}
          />
        )}
      </div>
    </div>
  );
}

interface RowProps {
  element: NonNullable<GetPendingFriendRequestsQuery["friendRequests"]["nodes"]>[number];
  removeCacheElement: (userId: string) => void;
}

function Row({ element, removeCacheElement }: RowProps) {
  const { userProfile } = useAuth();

  return (
    <UserNameplate.Root
      userId={element.otherUser!.id}
      avatarVersion={element.otherUser?.avatarVersion}
      userName={element.otherUser!.userName!}
      displayName={element.otherUser!.displayName!}
      className="hover-highlight w-full p-1.5"
    >
      {userProfile!.id === element.senderUserId ? (
        <>
          <FriendActionButtons.Cancel
            requestId={element.id}
            className="size-6"
            onSuccess={() => {
              removeCacheElement(element.id);
            }}
            onError={() => {
              toast.error("Failed to cancel friend request.");
            }}
          />

          <DropdownMenu.Separator className="horizontal-separator my-1.5" />
        </>
      ) : (
        <>
          <FriendActionButtons.Reject
            requestId={element.id}
            className="size-6"
            onSuccess={() => {
              removeCacheElement(element.id);
            }}
            onError={() => {
              toast.error("Failed to reject friend request.");
            }}
          />

          <FriendActionButtons.Accept
            requestId={element.id}
            className="size-6"
            onSuccess={() => {
              removeCacheElement(element.id);
            }}
            onError={() => {
              toast.error("Failed to accept friend request.");
            }}
          />

          <DropdownMenu.Separator className="horizontal-separator my-1.5" />
        </>
      )}

      <MoreActionsButton>
        <DropdownMenu.Item disabled className="dropdown-item-default">
          Visit Profile
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="horizontal-separator my-1.5" />

        <DropdownMenu.Item disabled className="dropdown-item-danger">
          Block
        </DropdownMenu.Item>

        <DropdownMenu.Item disabled className="dropdown-item-danger">
          Report User
        </DropdownMenu.Item>
      </MoreActionsButton>
    </UserNameplate.Root>
  );
}
