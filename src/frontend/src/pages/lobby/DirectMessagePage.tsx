import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import {useState} from "react";
import {BsPersonFill, BsTelephoneFill} from "react-icons/bs";
import Egg from "../../components/Egg.tsx";
import IconButton from "../../components/IconButton.tsx";
import UserProfilePanel from "../../components/UserProfilePanel.tsx";
import useConversationConnection from "../../hooks/useConversationConnection.ts";
import {userService} from "../../api/userService.ts";
import {useCallStore} from "../../store/useCallStore.ts";
import type {UserIdentityProfileDto, ServiceResponse, StartCallResult} from "../../api/types.ts";
import {toast} from "react-toastify";
import ShowPinnedMessagesButton from "../../components/ShowPinnedMessagesButton.tsx";
import {directConversationService} from "../../api/directConversationService.ts";
import useTimelineMessages from "../../hooks/useTimelineMessages.ts";
import {ChatView} from "../../components/chat/ChatView.tsx";
import ChatInput from "../../components/chat/ChatInput.tsx";
import ChatContainerContextProvider from "../../contexts/ChatContainerContext.tsx";

export default function DirectMessagePage() {
  useDocumentTitle("Conflux - DM");

  const loaderData: DirectMessagePageLoaderProps | undefined = useLoaderData();

  if (!loaderData) {
    return <FailurePage/>
  }

  return <SuccessPage conversationId={loaderData.conversationId} peerProfile={loaderData.peerProfile}/>
}

function FailurePage() {
  const [isEgg] = useState(() => Math.random() < 0.02);

  return (
    <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
      <header
        className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2"
      >
        <span>But nobody came...</span>
      </header>

      {isEgg ? (
        <Egg/>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center relative">
          <p className="text-transparent">The room between... there is a room between...</p>
        </div>
      )}
    </div>
  );
}

function SuccessPage({
  conversationId,
  peerProfile,
}: { conversationId: string, peerProfile: UserIdentityProfileDto }) {
  const [showProfile, setShowProfile] = useState(false);
  const { appendMessage } = useTimelineMessages(conversationId);

  useConversationConnection(conversationId);

  const startOutgoingDirectCall = useCallStore((state) => state.startOutgoingDirectCall);

  const handleCall = async () => {
    const response: ServiceResponse<StartCallResult> = await directConversationService.startDirectCall(peerProfile.id);

    if (response.success) {
      startOutgoingDirectCall(response.data!.callId, response.data!.calleeProfile);
      appendMessage(response.data!.message);
    } else {
      switch (response.error?.code) {
        case "AlreadyInCall":
          toast.error("You are already in a call.");
          break;

        case "CalleeBusy":
          toast.error("User is busy with another call.");
          break;

        case "NoAcceptedFriendRequest":
          toast.error("An accepted friend request is required to make a call to this person.");
          break;

        default:
          toast.error("Failed to start call.");
          console.error("Failed to start call:", response.error);
          break;
      }
    }
  };

  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);

  const handleJumpToPinnedMessage = (messageId: string) => {
    console.log("jump to message", messageId);
  };

  return (
    <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
      <header
        className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2"
      >
        <UserAvatar
          src={peerProfile.avatarRevision ? userService.getAvatarUrl(peerProfile.id, peerProfile.avatarRevision) : undefined}
          className="size-8 flex-none"
        />

        <span className="flex-1">{peerProfile.userName}</span>

        <div className="flex-none flex flex-row items-center gap-2">
          <ShowPinnedMessagesButton conversationId={conversationId} onPinnedMessageClick={handleJumpToPinnedMessage}/>

          <IconButton
            isLoading={false}
            theme="default"
            onClick={handleCall}
          >
            <BsTelephoneFill className="size-6"/>
          </IconButton>

          <IconButton
            theme="default"
            onClick={() => setShowProfile(!showProfile)}
          >
            <BsPersonFill className="size-6"/>
          </IconButton>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-row relative gap-0">
        <ChatContainerContextProvider
          conversationId={conversationId}
          anchorMessageId={jumpTargetId}
        >
          <div className="flex flex-col flex-1">
            <ChatView/>
            <ChatInput/>
          </div>
        </ChatContainerContextProvider>

        {showProfile && (
          <UserProfilePanel
            className="flex-0 border-l border-l-gray-600 basis-72 bg-gray-725"
            avatarClassName="border-gray-725 bg-gray-725"
            userId={peerProfile.id}
          />
        )}
      </div>
    </div>
  );
}