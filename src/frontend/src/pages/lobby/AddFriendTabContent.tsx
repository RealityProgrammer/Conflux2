import {useDebounceValue} from "usehooks-ts";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {
  type DiscoverFriendSummary,
  type PaginatedResult,
  type ServiceResponse,
} from "../../api/types.ts";
import {friendService} from "../../api/friendService.ts";
import type {
  FriendRequestAcceptedEvent,
  FriendRequestCanceledEvent,
  FriendRequestReceivedEvent,
  FriendRequestRejectedEvent,
  UnfriendedEvent
} from "../../api/events.ts";
import {DropdownMenu} from "radix-ui";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useFriendActions from "../../hooks/useFriendActions.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {UserRelationshipStatus} from "../../api/schema.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";

interface RowProps {
  user: DiscoverFriendSummary;
  updateCacheStatus: (userId: string, newStatus: UserRelationshipStatus) => void;
}

export default function AddFriendTabContent() {
  const PAGE_SIZE: number = 20;

  const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    enabled: !!userNameSearch,
    queryKey: ["discoverUsers", userNameSearch],
    queryFn: async ({pageParam = 0}): Promise<PaginatedResult<DiscoverFriendSummary> | null | undefined> => {
      const response: ServiceResponse<PaginatedResult<DiscoverFriendSummary>> =
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

  const queryClient = useQueryClient();

  const updateRelationshipStatus = (userId: string, newStatus: UserRelationshipStatus) => {
    queryClient.setQueryData<InfiniteData<PaginatedResult<DiscoverFriendSummary>>>(
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

  // handle realtime modification
  useSignalREvent("FriendRequestReceived", (event: FriendRequestReceivedEvent) => {
    updateRelationshipStatus(event.senderUserId, UserRelationshipStatus.IncomingRequest);
  });

  useSignalREvent("FriendRequestCanceled", (event: FriendRequestCanceledEvent) => {
    updateRelationshipStatus(event.senderUserId, UserRelationshipStatus.Stranger);
  });

  useSignalREvent("FriendRequestAccepted", (event: FriendRequestAcceptedEvent) => {
    updateRelationshipStatus(event.acceptorUserId, UserRelationshipStatus.Friended);
  });

  useSignalREvent("FriendRequestRejected", (event: FriendRequestRejectedEvent) => {
    updateRelationshipStatus(event.rejecterUserId, UserRelationshipStatus.Stranger);
  });

  useSignalREvent("Unfriended", (event: UnfriendedEvent) => {
    updateRelationshipStatus(event.invokerUserId, UserRelationshipStatus.Stranger);
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <header className="flex-none text-sm">
        <span className="block">Need to search for a friend?</span>
        <span className="block">You can send friend request with their username.</span>
      </header>

      <section className="flex-none flex flex-row h-10">
        <div
          className="select-none w-11 flex justify-center items-center border border-gray-600 rounded-l-lg border-r-0">
          @
        </div>

        <input 
          className="flex-1 input-field w-full px-3 rounded-l-none"
          placeholder="Enter username"
          onChange={(e) => {
            setUserNameSearch(e.target.value);
          }}/>
      </section>

      <div className="flex-1 overflow-hidden border-2 border-gray-600 rounded-md">
        {(!userNameSearch || userNameSearch.length === 0) ? (
          <div className="size-full flex flex-row justify-center items-center text-gray-500">
            <span className="select-none">Enter the name above</span>
          </div>
        ) : isLoading ? (
          <>
            {Array.from({length: 20}).map((_, index) => (
              <UserNameplate.Skeleton key={index} className="p-1.5"/>
            ))}
          </>
        ) : (
          <VirtualizedScrollList2
            totalCount={allElements.length}
            computeItemKey={(index) => allElements[index].userId}
            atBottomThreshold={120}
            endReached={() => fetchNextPage()}
            overscan={10}
            renderItem={(index) => {
              return (
                <Row user={allElements[index]} updateCacheStatus={updateRelationshipStatus}/>
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

function Row({user, updateCacheStatus}: RowProps) {
  const {mutation, activeAction} = useFriendActions(user.userId);

  const handleSendFriendRequest = () => mutation.mutate('send', {
    onSuccess: (response: ServiceResponse<UserRelationshipStatus>) => {
      if (response && response.success && response.data) {
        updateCacheStatus(user.userId, response.data);
      }
    },
  });
  const handleAcceptFriendRequest = () => mutation.mutate('accept', {
    onSuccess: (response: ServiceResponse) => {
      if (response && response.success) {
        updateCacheStatus(user.userId, UserRelationshipStatus.Friended);
      }
    }
  });
  const handleRejectFriendRequest = () => mutation.mutate('reject', {
    onSuccess: (response: ServiceResponse) => {
      if (response && response.success) {
        updateCacheStatus(user.userId, UserRelationshipStatus.Stranger);
      }
    }
  });
  const handleCancelFriendRequest = () => mutation.mutate('cancel', {
    onSuccess: (response: ServiceResponse) => {
      if (response && response.success) {
        updateCacheStatus(user.userId, UserRelationshipStatus.Stranger);
      }
    }
  });
  const handleUnfriend = () => mutation.mutate('unfriend', {
    onSuccess: (response: ServiceResponse) => {
      if (response && response.success) {
        updateCacheStatus(user.userId, UserRelationshipStatus.Stranger);
      }
    }
  });

  return (
    <UserNameplate.Root
      userId={user.userId}
      avatarVersion={user.avatarVersion ?? undefined}
      userName={user.userName}
      displayName={user.displayName}
      className="w-full p-1.5 hover-highlight"
    >
      {user.status == UserRelationshipStatus.Stranger ? (
        <FriendActionButtons.Send
          isExecuting={activeAction == 'send'}
          onClick={handleSendFriendRequest}
          className="size-6"/>
      ) : user.status == UserRelationshipStatus.IncomingRequest ? (
        <>
          <FriendActionButtons.Reject
            isExecuting={activeAction == 'reject'}
            onClick={handleRejectFriendRequest}
            className="size-6"/>

          <FriendActionButtons.Accept
            isExecuting={activeAction == 'accept'}
            onClick={handleAcceptFriendRequest}
            className="size-6"/>
        </>
      ) : user.status == UserRelationshipStatus.OutcomingRequest ? (
        <FriendActionButtons.Cancel
          isExecuting={activeAction == 'cancel'}
          onClick={handleCancelFriendRequest}
          className="size-6"/>
      ) : (
        <FriendActionButtons.Unfriend
          isExecuting={activeAction == 'unfriend'}
          className="size-6"
          onClick={handleUnfriend}/>
      )}

      <MoreActionsButton>
        <DropdownMenu.Item className="dropdown-item-default">
          Visit Profile
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="horizontal-separator my-1.5"/>

        {user.status == UserRelationshipStatus.Stranger ? (
          <DropdownMenu.Item
            className="dropdown-item-default"
            onSelect={handleSendFriendRequest}
          >
            Send Friend Request
          </DropdownMenu.Item>
        ) : user.status == UserRelationshipStatus.IncomingRequest ? (
          <>
            <DropdownMenu.Item
              className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
              onSelect={handleAcceptFriendRequest}
              disabled={!!activeAction}
            >
              Accept Friend Request
            </DropdownMenu.Item>

            <DropdownMenu.Item
              className="dropdown-item-danger"
              onSelect={handleRejectFriendRequest}
              disabled={!!activeAction}
            >
              Reject Friend Request
            </DropdownMenu.Item>
          </>
        ) : user.status == UserRelationshipStatus.OutcomingRequest ? (
          <DropdownMenu.Item
            className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
            onSelect={handleCancelFriendRequest}
            disabled={!!activeAction}
          >
            Cancel Friend Request
          </DropdownMenu.Item>
        ) : (
          <DropdownMenu.Item
            className="group relative flex p-2 select-none items-center rounded-sm leading-none outline-none button-cursor hover-highlight text-sm"
            onSelect={handleUnfriend}
            disabled={!!activeAction}
          >
            Unfriend
          </DropdownMenu.Item>
        )}

        <DropdownMenu.Separator className="horizontal-separator my-1.5"/>

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