import {useDebounceValue} from "usehooks-ts";
import {useQueryClient} from "@tanstack/react-query";
import {type FriendSearchResponse,} from "../../api/types.ts";
import {UserNameplate} from "../../components/UserNameplate.tsx";
import {FriendActionButtons} from "../../components/FriendActionButtons.tsx";
import {FriendSearchStatus, UserRelationshipStatus} from "../../api/schema.ts";
import {BsExclamationTriangle, BsQuestion} from "react-icons/bs";
import Container from "../../components/Container.tsx";
import useDiscoverFriend from "../../hooks/useDiscoverFriend.ts";
import {toast} from "react-toastify";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  FriendRequestAcceptedEvent,
  FriendRequestCanceledEvent,
  FriendRequestReceivedEvent,
  FriendRequestRejectedEvent, UnfriendedEvent
} from "../../api/events.ts";

export default function AddFriendTabContent() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useDebounceValue("", 500);

  const { data, isEnabled, isLoading, isError } = useDiscoverFriend(searchTerm, {
    enabled: searchTerm.length >= 8,
    retry: false,
  });

  const handleChangeStatus = (relationshipStatus: UserRelationshipStatus, friendRequestId: string | null | undefined) => {
    queryClient.setQueryData<FriendSearchResponse>(
      useDiscoverFriend.getKey(searchTerm),
      (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          result: !!oldData.result ? {
            ...oldData.result,
            relationshipStatus: relationshipStatus,
            friendRequestId: friendRequestId === undefined ? oldData.result.friendRequestId : friendRequestId,
          } : oldData.result,
        }
      }
    )
  };

  useSignalREvent("FriendRequestReceived", async (event: FriendRequestReceivedEvent) => {
    if (event.senderUserId === data?.result?.userProfile.id) {
      handleChangeStatus(UserRelationshipStatus.IncomingRequest, event.requestId);
    }
  });

  useSignalREvent("FriendRequestRejected", (event: FriendRequestRejectedEvent) => {
    if (event.rejecterUserId === data?.result?.userProfile.id) {
      handleChangeStatus(UserRelationshipStatus.Stranger, null);
    }
  });

  useSignalREvent("FriendRequestAccepted", (event: FriendRequestAcceptedEvent) => {
    if (event.acceptorUserId === data?.result?.userProfile.id) {
      handleChangeStatus(UserRelationshipStatus.Friended, event.requestId);
    }
  });

  useSignalREvent("FriendRequestCanceled", (event: FriendRequestCanceledEvent) => {
    if (event.senderUserId === data?.result?.userProfile.id) {
      handleChangeStatus(UserRelationshipStatus.Stranger, null);
    }
  });

  useSignalREvent("Unfriended", (event: UnfriendedEvent) => {
    if (event.invokerUserId === data?.result?.userProfile.id) {
      handleChangeStatus(UserRelationshipStatus.Stranger, null);
    }
  });

  return (
    <div className="w-full">
      <header className="text-sm">
        <p>Need to search for a friend?</p>
        <p>You can send friend request with their name or ID.</p>
      </header>

      <section className="flex flex-row h-10 mt-2">
        <div
          className="select-none w-11 flex justify-center items-center border-2 border-gray-600 rounded-l-lg border-r-0">
          @
        </div>

        <input
          className="flex-1 input-field w-full px-3 rounded-l-none"
          placeholder="Enter something here..."
          onChange={(e) => {
            setSearchTerm(e.target.value);
          }}
        />
      </section>

      <Container maxBreakpoint="lg" className="mt-4 flex flex-col justify-center items-center border-2 border-gray-600 rounded-md">
        {!isEnabled ? (
          <p className="p-3 select-none text-gray-500 text-sm">Enter at least 8 characters to search user.</p>
        ) : isLoading ? (
          <UserNameplate.Skeleton className="w-full p-1"/>
        ) : isError || !data ? (
          <div className="py-2 select-none text-sm text-center flex flex-col gap-1 justify-center items-center">
            <BsExclamationTriangle className="block size-8 fill-white"/>
            <p>An error occurred while discovering user...</p>
          </div>
        ) : data.status === FriendSearchStatus.NoUser ? (
          <div className="py-2 select-none text-sm text-center flex flex-col gap-1 justify-center items-center">
            <BsQuestion className="block size-8 fill-white"/>
            <p>Seems like nobody answered...</p>
          </div>
        ) : data.status === FriendSearchStatus.DisallowSelf ? (
          <div className="py-2 select-none text-sm text-center flex flex-col gap-1 justify-center items-center">
            <BsExclamationTriangle className="block size-8 fill-white"/>
            <p>Searching for yourself is not allowed.</p>
          </div>
        ) : (
          <UserNameplate.Root
            userId={data.result!.userProfile.id}
            displayName={data.result!.userProfile.displayName ?? "???"}
            userName={data.result!.userProfile.userName ?? undefined}
            avatarVersion={data.result!.userProfile.avatarVersion}
            className="w-full p-2"
          >
            {data.result!.relationshipStatus === "Stranger" ? (
              <FriendActionButtons.Send
                recipientId={data.result!.userProfile.id}
                className="size-6"
                onSuccess={(response, recipientId) => {
                  if (data.result!.userProfile.id === recipientId) {
                    handleChangeStatus(response.relationshipStatus, response.friendRequestId);
                  }
                }}
                onError={() => {
                  toast.error("Failed to send friend request.");
                }}
              />
            ) : data.result!.relationshipStatus === "IncomingRequest" ? (
              <>
                <FriendActionButtons.Reject
                  requestId={data.result!.friendRequestId!}
                  className="size-6"
                  onSuccess={(variables) => {
                    if (data.result!.friendRequestId === variables.requestId) {
                      handleChangeStatus(UserRelationshipStatus.Stranger, null);
                    }
                  }}
                  onError={() => {
                    toast.error("Failed to reject friend request.");
                  }}
                />

                <FriendActionButtons.Accept
                  requestId={data.result!.friendRequestId!}
                  className="size-6"
                  onSuccess={(variables) => {
                    if (data.result!.friendRequestId === variables.requestId) {
                      handleChangeStatus(UserRelationshipStatus.Friended, undefined);
                    }
                  }}
                  onError={() => {
                    toast.error("Failed to accept friend request.");
                  }}
                />
              </>
            ) : data.result!.relationshipStatus === "OutcomingRequest" ? (
              <FriendActionButtons.Cancel
                requestId={data.result!.friendRequestId!}
                className="size-6"
                onSuccess={(variables) => {
                  if (data.result!.friendRequestId === variables.requestId) {
                    handleChangeStatus(UserRelationshipStatus.Stranger, null);
                  }
                }}
                onError={() => {
                  toast.error("Failed to cancel friend request.");
                }}
              />
            ) : data.result!.relationshipStatus === "Friended" ? (
              <FriendActionButtons.Unfriend
                friendId={data.result!.userProfile.id}
                className="size-6"
                onSuccess={(friendId) => {
                  if (data.result!.userProfile.id === friendId) {
                    handleChangeStatus(UserRelationshipStatus.Stranger, null);
                  }
                }}
                onError={() => {
                  toast.error("Failed to unfriend.");
                }}
              />
            ) : null}
          </UserNameplate.Root>
        )}
      </Container>
    </div>
  );
}