import {useDebounceValue} from "usehooks-ts";
import {BsChatSquareText, BsSearch} from "react-icons/bs";
import {DropdownMenu} from "radix-ui";
import {type InfiniteData, useQueryClient} from "@tanstack/react-query";
import {type ServiceResponse} from "../../api/types.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import type {FriendRequestAcceptedEvent, UnfriendedEvent} from "../../api/events.ts";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import useFriendActions from "../../hooks/useFriendActions.ts";
import IconButton from "../../components/IconButton.tsx";
import {useNavigate} from "react-router";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";
import {type GetFriendsQuery, useInfiniteGetFriendsQuery} from "../../graphql/infiniteQueries.ts";

const ITEM_HEIGHT: number = 52;

export default function FriendListTabContent() {
  const navigation = useNavigate();

  const queryClient = useQueryClient();
  const [nameFilter, setNameFilter] = useDebounceValue("", 500);

  const {
    data,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteGetFriendsQuery(
    { after: null, nameFilter, },
    {
      initialPageParam: { after: null },
      getNextPageParam: lastPage => {
        const pageInfo = lastPage?.friends?.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
    }
  )
  
  const allElements = data?.pages.flatMap((page) => page?.friends.nodes ?? []) ?? [];

  const removeUser = (userId: string) => {
    queryClient.setQueryData<InfiniteData<GetFriendsQuery>>(
      useInfiniteGetFriendsQuery.getKey({ after: null }),
      (oldData) => {
        if (!oldData) return oldData;

        const elementExists = oldData.pages.some(page =>
          page?.friends.nodes!.some(element => element.otherUser!.id === userId)
        );

        if (!elementExists) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            friends: {
              ...page.friends,
              nodes: page.friends.nodes ? 
                page.friends.nodes.filter(n => n.otherUser!.id !== userId) :
                page.friends.nodes,
            }
          })),
        };
      }
    );
  };

  useSignalREvent("Unfriended", (event: UnfriendedEvent) => {
    removeUser(event.invokerUserId);
  });

  useSignalREvent("FriendRequestAccepted", (_event: FriendRequestAcceptedEvent) => {
    queryClient.invalidateQueries({
      queryKey: useInfiniteGetFriendsQuery.getKey({ after: null }),
    });
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-none relative w-full flex items-center">
        <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none"/>

        <input 
          className="input-field w-full h-10 px-3 pl-8" 
          placeholder="Search..."
          onChange={(e) => {
            setNameFilter(e.target.value);
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
            computeItemKey={(index) => allElements[index].otherUser!.id}
            atBottomThreshold={120}
            endReached={() => fetchNextPage()}
            overscan={10}
            renderItem={(index) => {
              return (
                <Row
                  element={allElements[index]}
                  removeFriend={removeUser}
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

interface RowProps {
  element: NonNullable<GetFriendsQuery["friends"]["nodes"]>[number];
  removeFriend: (userId: string) => void;
  navigateToDirectMessage: (userId: string) => void;
}

function Row({element, removeFriend, navigateToDirectMessage}: RowProps) {
  const {mutation, activeAction} = useFriendActions(element.otherUser!.id);

  const handleUnfriend = () => mutation.mutate('unfriend', {
    onSuccess: (response: ServiceResponse) => {
      if (response.success) {
        removeFriend(element.otherUser!.id)
      }
    }
  });

  const toDirectMessage = () => navigateToDirectMessage(element.otherUser!.id);

  return (
    <UserNameplate.Root
      userId={element.otherUser!.id}
      avatarVersion={element.otherUser?.avatar?.version}
      userName={element.otherUser!.userName ?? "???"}
      displayName={element.otherUser!.displayName ?? "???"}
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
