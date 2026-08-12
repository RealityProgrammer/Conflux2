import {useDebounceValue} from "usehooks-ts";
import {BsChatSquareText, BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {type PaginatedResponse, type ServiceResponse, type UserIdentityProfileDto} from "../../api/responses.ts";
import {friendService} from "../../api/friendService.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import Spinner from "../../components/Spinner.tsx";
import type {FriendRequestAcceptedEvent, UnfriendedEvent} from "../../api/events.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useFriendActions from "../../hooks/useFriendActions.ts";
import IconButton from "../../components/IconButton.tsx";
import {useNavigate} from "react-router";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import {useFetchUserBasicProfile} from "../../hooks/fetchUserBasicProfile.ts";

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
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKey,
    queryFn: async ({pageParam = 0}): Promise<PaginatedResponse<UserIdentityProfileDto> | null | undefined> => {
      const response: ServiceResponse<PaginatedResponse<UserIdentityProfileDto>> =
        await friendService.queryFriends(userNameSearch, pageParam, PAGE_SIZE);

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
    queryClient.setQueryData<InfiniteData<PaginatedResponse<UserIdentityProfileDto>>>(
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

  useSignalREvent("Unfriended", (notif: UnfriendedEvent) => {
    handleRemoveUserFromCache(notif.invokerUserId);
  });

  const getUserBasicProfile = useFetchUserBasicProfile();

  useSignalREvent("FriendRequestAccepted", async (notif: FriendRequestAcceptedEvent) => {
    const profileResponse = await getUserBasicProfile(notif.acceptorUserId);

    if (!profileResponse.success) return;

    const userProfile = profileResponse.data!;

    queryClient.setQueryData<InfiniteData<PaginatedResponse<UserIdentityProfileDto> | null | undefined>>(
      queryKey,
      (oldData) => {
        if (!oldData || oldData.pages.length === 0) return oldData;

        const alreadyExists = oldData.pages.some(page =>
          page?.elements.some(el => el.id === notif.acceptorUserId)
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
        renderItem={(itemIndex: number) =>
          <Row element={allElements[itemIndex]}
               removeUserFromCache={() => handleRemoveUserFromCache(allElements[itemIndex].id)}
               navigateToDirectMessage={(userId) => navigation(`/lobby/dm/${encodeURIComponent(userId)}`)}/>
        }
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
    <UserNameplate.Root userId={element.id}
                        userName={element.userName}
                        displayName={element.displayName}
                        hasAvatar={element.hasAvatar}
                        className="w-full p-1.5"
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

        <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

        <DropdownMenu.Item className="dropdown-item-danger" disabled={!!activeAction} onSelect={handleUnfriend}>
          Unfriend
        </DropdownMenu.Item>

        <DropdownMenu.Separator className="h-px bg-gray-500 my-1.5"/>

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
