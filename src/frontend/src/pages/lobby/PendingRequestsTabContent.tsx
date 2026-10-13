import {useDebounceValue} from "usehooks-ts";
import {BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {type PaginatedResult, type PendingFriendRequestDto, type ServiceResponse} from "../../api/types.ts";
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
import {sessionUserService} from "../../api/sessionUserService.ts";
import {UserRelationshipStatus} from "../../api/schema.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";

const ITEM_HEIGHT: number = 52;

interface RowProps {
  element: PendingFriendRequestDto;
  removeCacheElement: (userId: string) => void;
}

export default function PendingRequestsTabContent() {
  const PAGE_SIZE: number = 20;

  const queryClient = useQueryClient();
  const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

  const queryKey = ["queryPendingRequests", { userNameSearch }];

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({pageParam = 0}): Promise<PaginatedResult<PendingFriendRequestDto> | null | undefined> => {
      const response: ServiceResponse<PaginatedResult<PendingFriendRequestDto>> =
        await sessionUserService.queryPendingRequests(userNameSearch, pageParam, PAGE_SIZE);

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
    queryClient.setQueryData<InfiniteData<PaginatedResult<PendingFriendRequestDto>>>(
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

  useSignalREvent("FriendRequestReceived", async (_event: FriendRequestReceivedEvent) => {
    queryClient.invalidateQueries({
      queryKey: ['queryPendingRequests'],
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
      <div className="flex-none relative w-full flex items-center">
        <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none"/>

        <input 
          className="input-field w-full h-10 px-3 pl-8"
          placeholder="Search..."
          onChange={(e) => {
            setUserNameSearch(e.target.value);
          }}/>
      </div>

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
            computeItemKey={(index) => allElements[index].userId}
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
      avatarVersion={element.avatarRevision ?? undefined}
      userName={element.userName}
      displayName={element.displayName}
      className="w-full p-1.5 hover-highlight"
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

          <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
        </>
      ) : element.status === UserRelationshipStatus.OutcomingRequest && (
        <>
          <FriendActionButtons.Cancel
            isExecuting={!!activeAction}
            className="size-6"
            onClick={handleCancel}/>

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

            <DropdownMenu.Separator className="horizontal-separator my-1.5"/>
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