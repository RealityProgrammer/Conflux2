import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import {useState} from "react";
import {BsPerson} from "react-icons/bs";
import ChatContainer from "../../components/ChatContainer.tsx";
import Egg from "../../components/Egg.tsx";
import IconButton from "../../components/IconButton.tsx";
import UserProfilePanel from "../../components/UserProfilePanel.tsx";

export default function DirectMessagePage() {
  useDocumentTitle("DM - Conflux");

  const {channelId, channelSummary}: DirectMessagePageLoaderProps = useLoaderData();

  const [showProfile, setShowProfile] = useState(true);

  return (
    <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
      <header
        className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2">
        {!!channelId && !!channelSummary ? (
          <>
            <UserAvatar hasAvatar={channelSummary.otherUser.hasAvatar}
                        className="size-8 overflow-hidden rounded-full"/>

            <p>{channelSummary.otherUser.userName}</p>

            <IconButton
              isLoading={false}
              onClick={() => setShowProfile(!showProfile)}
              className="ml-auto"
              theme="default"
            >
              <BsPerson className="size-6"/>
            </IconButton>
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

            // <div className="flex-0 border-l border-l-gray-600 basis-72 bg-gray-725">
            //   <UserProfilePanel
            //     userId={channelSummary.otherUser.id}
            //   />
            // </div>
          )}
        </div>
      ) : Math.random() * 100 >= 2 ? (
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center relative">
          <p className="text-transparent">The room between... there is a room between...</p>
        </div>
      ) : (
        <Egg/>
      )}
    </div>
  );
}
