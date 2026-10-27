import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useQueryClient} from "@tanstack/react-query";
import {type ServiceResponse} from "../../api/types.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import type {
  FriendRequestAcceptedEvent,
  FriendRequestCanceledEvent,
  FriendRequestReceivedEvent,
  FriendRequestRejectedEvent
} from "../../api/events.ts";
import useFriendActions from "../../hooks/useFriendActions.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";
import {
  type GetPendingFriendRequestsQuery,
  useInfiniteGetPendingFriendRequestsQuery
} from "../../graphql/infiniteQueries.ts";
import {useAuth} from "../../contexts/AuthContext.tsx";

export default function PendingRequestsTabContent() {
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteGetPendingFriendRequestsQuery(
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
    }
  )

  const allElements = data?.pages.flatMap((page) => page?.friendRequests.nodes ?? []) ?? [];

  const removeCacheElement = (otherUserId: string) => {
    queryClient.setQueryData<InfiniteData<GetPendingFriendRequestsQuery>>(
      useInfiniteGetPendingFriendRequestsQuery.getKey({after: null}),
      (oldData) => {
        if (!oldData || oldData.pages.length === 0) return oldData;

        const elementExists = oldData.pages.some(page =>
          page?.friendRequests.nodes!.some(element => element.otherUser!.id === otherUserId)
        );

        if (!elementExists) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            friendRequests: {
              ...page.friendRequests,
              nodes: page.friendRequests.nodes ?
                page.friendRequests.nodes.filter(n => n.otherUser!.id !== otherUserId) :
                page.friendRequests.nodes,
            }
          })),
        };
      }
    );
  };

  useSignalREvent("FriendRequestReceived", async (_event: FriendRequestReceivedEvent) => {
    queryClient.invalidateQueries({
      queryKey: useInfiniteGetPendingFriendRequestsQuery.getKey({}),
    });
  });

  useSignalREvent("FriendRequestRejected", (event: FriendRequestRejectedEvent) => {
    removeCacheElement(event.rejecterUserId);
  });

  useSignalREvent("FriendRequestAccepted", (event: FriendRequestAcceptedEvent) => {
    removeCacheElement(event.acceptorUserId);
  });

  useSignalREvent("FriendRequestCanceled", (event: FriendRequestCanceledEvent) => {
    removeCacheElement(event.senderUserId);
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-1 overflow-hidden border-2 border-gray-600 rounded-md">
        {isLoading ? (
          <>
            {Array.from({length: 20}).map((_, index) => (
              <UserNameplate.Skeleton key={index} className="p-1.5"/>
            ))}
          </>
        ) : (
          <VirtualizedScrollList2
            totalCount={allElements.length}
            computeItemKey={(index) => allElements[index].id}
            atBottomThreshold={120}
            endReached={() => fetchNextPage()}
            overscan={10}
            renderItem={(index) => {
              return (
                <Row element={allElements[index]} removeCacheElement={removeCacheElement}/>
              );
            }}
            renderEmpty={() => (
              <div className="size-full flex flex-row justify-center items-center text-gray-500">
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

function Row({
  element, 
  removeCacheElement
}: RowProps) {
  const {mutation, activeAction} = useFriendActions(element.otherUser!.id);
  const { userProfile } = useAuth();

  const handleAccept = () => {
    mutation.mutate('accept', {
      onSuccess: (response: ServiceResponse) => {
        if (response.success) {
          removeCacheElement(element.otherUser!.id);
        }
      },
    });
  }

  const handleReject = () => {
    mutation.mutate('reject', {
      onSuccess: (response: ServiceResponse) => {
        if (response.success) {
          removeCacheElement(element.otherUser!.id);
        }
      },
    });
  }

  const handleCancel = () => {
    mutation.mutate('cancel', {
      onSuccess: (response: ServiceResponse) => {
        if (response.success) {
          removeCacheElement(element.id);
        }
      },
    });
  }

  return (
    <UserNameplate.Root
      userId={element.otherUser!.id}
      avatarVersion={element.otherUser?.avatar?.version}
      userName={element.otherUser!.userName!}
      displayName={element.otherUser!.displayName!}
      className="w-full p-1.5 hover-highlight"
    >
      {userProfile!.id === element.senderUserId ? (
        <>
          <FriendActionButtons.Cancel
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleCancel}/>

          <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
        </>
      ) : (
        <>
          <FriendActionButtons.Reject
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleReject}/>

          <FriendActionButtons.Accept
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleAccept}/>

          <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
        </>
      )}

      <MoreActionsButton>
        <DropdownMenu.Item className="dropdown-item-default">
          Visit Profile
        </DropdownMenu.Item>

        <DropdownMenu.Item className="dropdown-item-default">
          Direct Message
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="horizontal-separator my-1.5"/>

        {userProfile!.id === element.senderUserId ? (
          <>
            <DropdownMenu.Item
              className="dropdown-item-danger"
              disabled={!!activeAction}
              onSelect={handleCancel}
            >
              Cancel Request
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
          </>
        ) : (
          <>
            <DropdownMenu.Item
              className="dropdown-item-default"
              disabled={!!activeAction}
              onSelect={handleReject}
            >
              Reject Request
            </DropdownMenu.Item>

            <DropdownMenu.Item 
              className="dropdown-item-default"
              disabled={!!activeAction}
              onSelect={handleReject}
            >
              Accept Request
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
          </>
        )}

        <DropdownMenu.Item className="dropdown-item-danger">
          Block
        </DropdownMenu.Item>

        <DropdownMenu.Item className="dropdown-item-danger">
          Report User
        </DropdownMenu.Item>
      </MoreActionsButton>
    </UserNameplate.Root>
  )
}