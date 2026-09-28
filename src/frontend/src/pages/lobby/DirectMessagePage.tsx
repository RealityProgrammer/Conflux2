import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import {useState} from "react";
import {BsPersonFill, BsTelephoneFill} from "react-icons/bs";
import ChatContainer from "../../components/chat/ChatContainer.tsx";
import Egg from "../../components/Egg.tsx";
import IconButton from "../../components/IconButton.tsx";
import UserProfilePanel from "../../components/UserProfilePanel.tsx";
import useChannelConnection from "../../hooks/useChannelConnection.ts";
import {userService} from "../../api/userService.ts";
import {useCallStore} from "../../store/useCallStore.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import type {DirectCallContext} from "../../api/types.ts";

export default function DirectMessagePage() {
  useDocumentTitle("Conflux - DM");

  const {channelId, channelSummary}: DirectMessagePageLoaderProps = useLoaderData();
  const [showProfile, setShowProfile] = useState(false);

  useChannelConnection(channelId);
  const { invokeSafely } = useSignalR();

  const startOutgoingDirectCall = useCallStore((state) => state.startOutgoingDirectCall);

  const handleCall = async () => {
    if (!channelSummary) return;

    try {
      const context: DirectCallContext = await invokeSafely("StartDirectCall", channelSummary.otherUser.id);

      if (context.result.isSuccess) {
        startOutgoingDirectCall(context.peerProfile);
      } else {
        console.error("Failed to start call:", context.result.error.message);
      }

    } catch (err) {
      console.error("Failed to start call:", err);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
      <header
        className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2">
        {!!channelId && !!channelSummary ? (
          <>
            <UserAvatar
              src={channelSummary.otherUser.avatarRevision ? userService.getAvatarUrl(channelSummary.otherUser.id, channelSummary.otherUser.avatarRevision) : undefined}
              className="size-8 flex-none"
            />

            <span className="flex-1">{channelSummary.otherUser.userName}</span>

            <div className="flex-none flex flex-row items-center gap-2">
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
          </>
        ) : (
          <p>But nobody came...</p>
        )}
      </header>

      {channelId && channelSummary ? (
        <div className="flex-1 min-h-0 flex flex-row relative gap-0">
          <ChatContainer channelId={channelId!}/>

          {showProfile && (
            <UserProfilePanel
              className="flex-0 border-l border-l-gray-600 basis-72 bg-gray-725"
              userId={channelSummary.otherUser.id}
            />
          )}
        </div>
      ) : (<ShowAccessFailure/>)}
    </div>
  );
}

function ShowAccessFailure() {
  const [isEgg] = useState(() => Math.random() < 0.02);

  if (isEgg) {
    return <Egg/>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-center items-center relative">
      <p className="text-transparent">The room between... there is a room between...</p>
    </div>
  );
}