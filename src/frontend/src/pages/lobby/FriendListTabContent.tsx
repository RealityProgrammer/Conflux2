import { useDebounceValue } from "usehooks-ts";
import { BsChatSquareText, BsSearch } from "react-icons/bs";
import { DropdownMenu } from "radix-ui";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { UserNameplate } from "../../components/UserNameplate.tsx";
import MoreActionsButton from "../../components/MoreActionsButton.tsx";
import type {
  FriendRequestAcceptedEvent,
  UnfriendedEvent,
} from "../../api/events.ts";
import { FriendActionButtons } from "../../components/FriendActionButtons.tsx";
import IconButton from "../../components/IconButton.tsx";
import { useNavigate } from "react-router";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import VirtualizedScrollList2 from "../../components/VirtualizedScrollList2.tsx";
import {
  type GetFriendsQuery,
  useInfiniteGetFriendsQuery,
} from "../../graphql/infiniteQueries.ts";
import { toast } from "react-toastify";

const ITEM_HEIGHT: number = 52;

export default function FriendListTabContent() {
  const navigation = useNavigate();

  const queryClient = useQueryClient();
  const [nameFilter, setNameFilter] = useDebounceValue("", 500);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } =
    useInfiniteGetFriendsQuery(
      { after: null, nameFilter },
      {
        initialPageParam: { after: null },
        getNextPageParam: (lastPage) => {
          const pageInfo = lastPage?.friends?.pageInfo;

          if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
            return { after: pageInfo.endCursor };
          }

          return undefined;
        },
      },
    );

  const allElements =
    data?.pages.flatMap((page) => page?.friends.nodes ?? []) ?? [];

  const removeUser = (userId: string) => {
    queryClient.setQueriesData<InfiniteData<GetFriendsQuery>>(
      { queryKey: useInfiniteGetFriendsQuery.getKey() },
      (oldData) => {
        if (!oldData) return oldData;

        const elementExists = oldData.pages.some((page) =>
          page?.friends.nodes!.some(
            (element) => element.otherUser!.id === userId,
          ),
        );

        if (!elementExists) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            friends: {
              ...page.friends,
              nodes: page.friends.nodes
                ? page.friends.nodes.filter((n) => n.otherUser!.id !== userId)
                : page.friends.nodes,
            },
          })),
        };
      },
    );
  };

  useSignalREvent("Unfriended", (event: UnfriendedEvent) => {
    removeUser(event.invokerUserId);
  });

  useSignalREvent(
    "FriendRequestAccepted",
    (_event: FriendRequestAcceptedEvent) => {
      queryClient.invalidateQueries({
        queryKey: useInfiniteGetFriendsQuery.getKey({ after: null }),
      });
    },
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative flex w-full flex-none items-center">
        <BsSearch className="pointer-events-none absolute left-2.5 size-4 fill-white" />

        <input
          className="input-field h-9 text-sm w-full px-3 pl-8"
          placeholder="Search..."
          onChange={(e) => {
            setNameFilter(e.target.value);
          }}
        />
      </div>

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
            computeItemKey={(index) => allElements[index].otherUser!.id}
            atBottomThreshold={120}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage && !isLoading) {
                fetchNextPage();
              }
            }}
            overscan={10}
            renderItem={(index) => {
              return (
                <Row
                  element={allElements[index]}
                  removeFriend={removeUser}
                  navigateToDirectMessage={(userId) =>
                    navigation(`/lobby/me/dm/${encodeURIComponent(userId)}`)
                  }
                />
              );
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
  element: NonNullable<GetFriendsQuery["friends"]["nodes"]>[number];
  removeFriend: (userId: string) => void;
  navigateToDirectMessage: (userId: string) => void;
}

function Row({ element, removeFriend, navigateToDirectMessage }: RowProps) {
  const toDirectMessage = () => navigateToDirectMessage(element.otherUser!.id);

  return (
    <UserNameplate.Root
      userId={element.otherUser!.id}
      avatarVersion={element.otherUser?.avatarVersion}
      userName={element.otherUser!.userName ?? "???"}
      displayName={element.otherUser!.displayName ?? "???"}
      className="hover-highlight w-full p-1.5"
      style={{ height: `${ITEM_HEIGHT}px` }}
    >
      <IconButton
        theme="default"
        onClick={toDirectMessage}
        className="size-6"
        isLoading={false}
      >
        <BsChatSquareText className="size-6" />
      </IconButton>

      <FriendActionButtons.Unfriend
        friendId={element.otherUser!.id}
        className="size-6"
        onSuccess={() => {
          removeFriend(element.otherUser!.id);
        }}
        onError={() => {
          toast.error("Failed to unfriend user.");
        }}
      />

      <MoreActionsButton>
        <DropdownMenu.Item disabled className="dropdown-item-default">
          Visit Profile
        </DropdownMenu.Item>

        <DropdownMenu.Item
          className="dropdown-item-default"
          onSelect={toDirectMessage}
        >
          Direct Message
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
