import {useDebounceValue} from "usehooks-ts";
import {BsChatSquareText, BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {type PaginatedResult, type ServiceResponse, type UserIdentityProfileDto} from "../../api/types.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import type {FriendRequestAcceptedEvent, UnfriendedEvent} from "../../api/events.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useFriendActions from "../../hooks/useFriendActions.ts";
import IconButton from "../../components/IconButton.tsx";
import {useNavigate} from "react-router";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {sessionUserService} from "../../api/sessionUserService.ts";
import {useGetUserIdentityProfileQuery} from "../../graphql/queries.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";

const ITEM_HEIGHT: number = 52;

interface RowProps {
  element: UserIdentityProfileDto;
  removeUserFromCache: (userId: string) => void;
  navigateToDirectMessage: (userId: string) => void;
}

export default function FriendListTabContent() {
  const PAGE_SIZE: number = 20;

  const navigation = useNavigate();

  const queryClient = useQueryClient();
  const [userNameSearch, setUserNameSearch] = useDebounceValue("", 500);

  const queryKey = ["queryFriends", userNameSearch];

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({pageParam = 0}): Promise<PaginatedResult<UserIdentityProfileDto> | null | undefined> => {
      const response: ServiceResponse<PaginatedResult<UserIdentityProfileDto>> =
        await sessionUserService.queryFriends(userNameSearch, pageParam, PAGE_SIZE);

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

  const handleRemoveUserFromCache = (userId: string) => {
    queryClient.setQueryData<InfiniteData<PaginatedResult<UserIdentityProfileDto>>>(
      queryKey,
      (oldData) => {
        if (!oldData) return oldData;

        const elementExists = oldData.pages.some(page =>
          page?.elements.some(element => element.id === userId)
        );

        if (!elementExists) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            if (!page) return page;

            const filteredElements = page.elements.filter(
              (element) => element.id !== userId
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

  useSignalREvent("Unfriended", (event: UnfriendedEvent) => {
    handleRemoveUserFromCache(event.invokerUserId);
  });

  useSignalREvent("FriendRequestAccepted", async (event: FriendRequestAcceptedEvent) => {
    const profileResponse = await queryClient.query({
      queryKey: useGetUserIdentityProfileQuery.getKey({ id: event.acceptorUserId }),
      queryFn: useGetUserIdentityProfileQuery.fetcher({ id: event.acceptorUserId }),
    })

    const userProfile = profileResponse.user;
    if (!userProfile) return;

    queryClient.setQueryData<InfiniteData<PaginatedResult<UserIdentityProfileDto> | null | undefined>>(
      queryKey,
      (oldData) => {
        if (!oldData || oldData.pages.length === 0) return oldData;

        const alreadyExists = oldData.pages.some(page =>
          page?.elements.some(el => el.id === event.acceptorUserId)
        );

        if (alreadyExists) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (!page) return page;

            const updatedElements = index === 0
              ? [userProfile, ...page.elements]
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

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-none relative w-full flex items-center">
        <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none"/>

        <input 
          className="input-field w-full h-10 px-3 pl-8" 
          placeholder="Search..."
          onChange={(e) => {
            setUserNameSearch(e.target.value);
          }}
        />
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
            computeItemKey={(index) => allElements[index].id}
            atBottomThreshold={120}
            endReached={() => fetchNextPage()}
            overscan={10}
            renderItem={(index) => {
              return (
                <Row
                  element={allElements[index]}
                  removeUserFromCache={() => handleRemoveUserFromCache(allElements[index].id)}
                  navigateToDirectMessage={(userId) => navigation(`/lobby/me/dm/${encodeURIComponent(userId)}`)}
                />
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

function Row({element, removeUserFromCache, navigateToDirectMessage}: RowProps) {
  const {mutation, activeAction} = useFriendActions(element.id);

  const handleUnfriend = () => mutation.mutate('unfriend', {
    onSuccess: (response: ServiceResponse) => {
      if (response.success) {
        removeUserFromCache(element.id)
      }
    }
  });

  const toDirectMessage = () => navigateToDirectMessage(element.id);

  return (
    <UserNameplate.Root
      userId={element.id}
      avatarVersion={element.avatar?.version}
      userName={element.userName ?? "???"}
      displayName={element.displayName ?? "???"}
      className="w-full p-1.5 hover-highlight"
      style={{height: `${ITEM_HEIGHT}px`}}
    >
      <IconButton theme="default" onClick={toDirectMessage} className="size-6" isLoading={false}>
        <BsChatSquareText className="size-6"/>
      </IconButton>

      <FriendActionButtons.Unfriend isExecuting={!!activeAction} className="size-6" onClick={handleUnfriend}/>

      <MoreActionsButton>
        <DropdownMenu.Item className="dropdown-item-default">
          Visit Profile
        </DropdownMenu.Item>

        <DropdownMenu.Item className="dropdown-item-default" onSelect={toDirectMessage}>
          Direct Message
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="horizontal-separator my-1.5"/>

        <DropdownMenu.Item className="dropdown-item-danger" disabled={!!activeAction} onSelect={handleUnfriend}>
          Unfriend
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="horizontal-separator my-1.5"/>

        <DropdownMenu.Item className="dropdown-item-danger">
          Block
        </DropdownMenu.Item>

        <DropdownMenu.Item className="dropdown-item-danger">
          Report User
        </DropdownMenu.Item>
      </MoreActionsButton>
    </UserNameplate.Root>
  );
}
