import {useDebounceValue} from "usehooks-ts";
import {BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
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
import type {
  FriendRequestAcceptedEvent,
  FriendRequestCanceledEvent,
  FriendRequestReceivedEvent,
  FriendRequestRejectedEvent
} from "../../api/events.ts";
import useFriendActions from "../../hooks/useFriendActions.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import {useCacheService} from "../../hooks/useCacheService.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";

const ITEM_HEIGHT: number = 52;

interface RowProps {
  element: QueryPendingRequestElement;
  removeCacheElement: (userId: string) => void;
}

export default function PendingRequestsTabContent() {
  const PAGE_SIZE: number = 20;

  const queryClient = useQueryClient();
  const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

  const queryKey = ["queryPendingRequests", userNameSearch];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({pageParam = 0}): Promise<PaginatedResponse<QueryPendingRequestElement> | null | undefined> => {
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

  const removeCacheElement = (userId: string) => {
    queryClient.setQueryData<InfiniteData<PaginatedResponse<QueryPendingRequestElement>>>(
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

  const {getUserBasicProfile} = useCacheService();

  useSignalREvent("FriendRequestReceived", async (notif: FriendRequestReceivedEvent) => {
    const profileResponse = await getUserBasicProfile(notif.senderUserId);

    if (!profileResponse.success) return;

    const userProfile = profileResponse.data!;

    const newElement: QueryPendingRequestElement = {
      userId: notif.senderUserId,
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
          page?.elements.some(el => el.userId === notif.senderUserId)
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

  useSignalREvent("FriendRequestRejected", (notif: FriendRequestRejectedEvent) => {
    removeCacheElement(notif.rejecterUserId);
  });

  useSignalREvent("FriendRequestAccepted", (notif: FriendRequestAcceptedEvent) => {
    removeCacheElement(notif.acceptorUserId);
  });

  useSignalREvent("FriendRequestCanceled", (notif: FriendRequestCanceledEvent) => {
    removeCacheElement(notif.senderUserId);
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-none relative w-full flex items-center">
        <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none"/>

        <input className="input-field w-full h-11 px-3 pl-8"
               placeholder="Search..."
               onChange={(e) => {
                 setUserNameSearch(e.target.value);
               }}/>
      </div>

      <VirtualizedScrollList
        className="flex-1"
        viewportClassName="rounded-md border-2 border-gray-600"
        itemCount={allElements.length}
        isLoading={isLoading}
        estimateSize={() => ITEM_HEIGHT}
        fetchNextPage={() => {
          fetchNextPage()
        }}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        renderEmpty={() => (
          <div className="flex flex-1 select-none items-center justify-center text-gray-400">
            No items found.
          </div>
        )}
        renderItem={(itemIndex: number) => (
          <Row element={allElements[itemIndex]} removeCacheElement={removeCacheElement}/>
        )}
        renderSkeletonItem={(index) => (
          <UserNameplate.Skeleton key={index}
                                  className="p-1.5"
                                  style={{height: `${ITEM_HEIGHT}px`}}/>
        )}
        renderFetchingNext={() => (
          <div
            className="flex w-full items-center justify-center"
            style={{height: `${ITEM_HEIGHT}px`}}
          >
            <Spinner className="size-6 fill-white align-middle"/>
          </div>
        )}/>
    </div>
  );
}

function Row({element, removeCacheElement}: RowProps) {
  const {mutation, activeAction} = useFriendActions(element.userId);

  const handleAccept = () => {
    mutation.mutate('accept', {
      onSuccess: (response: ServiceResponse) => {
        if (response.success) {
          removeCacheElement(element.userId);
        }
      },
    });
  }

  const handleReject = () => {
    mutation.mutate('reject', {
      onSuccess: (response: ServiceResponse) => {
        if (response.success) {
          removeCacheElement(element.userId);
        }
      },
    });
  }

  const handleCancel = () => {
    mutation.mutate('cancel', {
      onSuccess: (response: ServiceResponse) => {
        if (response.success) {
          removeCacheElement(element.userId);
        }
      },
    });
  }

  return (
    <UserNameplate.Root
      userId={element.userId}
      userName={element.userName}
      displayName={element.displayName}
      hasAvatar={element.hasAvatar}
      className="w-full p-1.5"
      style={{height: `${ITEM_HEIGHT}px`}}
    >
      {element.status === UserRelationshipStatus.IncomingRequest ? (
        <>
          <FriendActionButtons.Reject
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleReject}/>

          <FriendActionButtons.Accept
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleAccept}/>

          <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>
        </>
      ) : element.status === UserRelationshipStatus.OutcomingRequest && (
        <>
          <FriendActionButtons.Cancel
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleCancel}/>

          <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>
        </>
      )}

      <MoreActionsButton>
        <DropdownMenu.Item className="dropdown-item-default">
          Visit Profile
        </DropdownMenu.Item>

        <DropdownMenu.Item className="dropdown-item-default">
          Direct Message
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

        {element.status === UserRelationshipStatus.IncomingRequest ? (
          <>
            <DropdownMenu.Item
              className="dropdown-item-default"
              disabled={!!activeAction}
              onSelect={handleReject}
            >
              Reject Request
            </DropdownMenu.Item>

            <DropdownMenu.Item className="dropdown-item-default"
                               disabled={!!activeAction}
                               onSelect={handleReject}
            >
              Accept Request
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>
          </>
        ) : element.status === UserRelationshipStatus.OutcomingRequest && (
          <>
            <DropdownMenu.Item
              className="dropdown-item-danger"
              disabled={!!activeAction}
              onSelect={handleCancel}
            >
              Cancel Request
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>
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