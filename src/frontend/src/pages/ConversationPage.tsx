import {useLoaderData} from "react-router";
import ConversationContextProvider, {
  type ConversationSource,
  useConversationContext
} from "../contexts/ConversationContext.tsx";
import {Avatar} from "../components/Avatar.tsx";
import type {DmConversationDetails, ServerChannelConversationDetails} from "../api/types.ts";
import {ChannelType} from "../api/schema.ts";
import {BsChatTextFill, BsPeopleFill, BsPersonFill, BsSearch, BsVolumeUp} from "react-icons/bs";
import ChatContainerContextProvider from "../contexts/ChatContainerContext.tsx";
import {ChatView} from "../components/chat/ChatView.tsx";
import TypingIndicator from "../components/chat/TypingIndicator.tsx";
import ChatInput from "../components/chat/ChatInput.tsx";
import useConversationConnection from "../hooks/useConversationConnection.ts";
import ShowPinnedMessagesButton from "../components/ShowPinnedMessagesButton.tsx";
import {FaSearch} from "react-icons/fa";
import IconButton from "../components/IconButton.tsx";
import {FaPerson} from "react-icons/fa6";
import {useState} from "react";
import UserProfilePanel from "../components/UserProfilePanel.tsx";
import ServerMemberList from "../components/server/ServerMemberList.tsx";

export default function ConversationPage() {
  const loaderData = useLoaderData<ConversationSource>();

  return (
    <ConversationContextProvider source={loaderData}>
      <ContextConsumer/>
    </ConversationContextProvider>
  );
}

function ContextConsumer() {
  const { source, detailsQuery } = useConversationContext();

  return (
    <>
      { source.type === "invalid" || !detailsQuery || (detailsQuery && detailsQuery.isError) ? (
        <ErrorDisplay/>
      ) : detailsQuery.isLoading ? (
        <LoadingDisplay/>
      ) : (
        <SuccessDisplay/>
      )}
    </>
  )
}

function LoadingDisplay() {
  return (
    <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
      <header
        className="flex-none h-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2 text-sm"
      >
        <div className="flex-none size-7 bg-white/10 animate-pulse rounded-full"></div>
        <div className="flex-1 h-5 bg-white/10 animate-pulse w-1/2 max-w-lg rounded-full"></div>
      </header>
    </div>
  );
}

function ErrorDisplay() {
  return (
    <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
      <header
        className="flex-none h-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2 text-sm"
      >
        <p>But nobody came...</p>
      </header>
    </div>
  );
}

function SuccessDisplay() {
  const { source, detailsQuery } = useConversationContext();

  if (!detailsQuery || !detailsQuery.data) {
    throw new Error("Details query of ConversationPage does not have value");
  }

  const conversationId = detailsQuery.data!.conversationId;
  useConversationConnection(conversationId);

  const [showRightSidebar, setShowRightSidebar] = useState(false);

  const toggleRightSidebar = () => {
    setShowRightSidebar(!showRightSidebar);
  }

  return (
    <ChatContainerContextProvider>
      <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
        <header
          className="flex-none h-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2 text-sm"
        >
          {source.type === "dm" ? (
            <DmHeader toggleRightSidebar={toggleRightSidebar}/>
          ) : source.type === "server-channel" ? (
            <ServerChannelHeader toggleRightSidebar={toggleRightSidebar}/>
          ) : null}
        </header>

        <main className="flex-1 flex flex-row relative size-full overflow-hidden">
          <section className="flex-1 flex flex-col gap-0 min-w-0">
            <ChatView/>
            <TypingIndicator/>
            <ChatInput/>
          </section>

          <aside
            className={`
              flex flex-col bg-gray-725 border-l-2 border-l-gray-600 z-10 absolute right-0 top-0 h-full w-80 transition-transform duration-300 ease-in-out
              
              ${showRightSidebar ? "translate-x-0 shadow-2xl" : "translate-x-full pointer-events-none"}

              lg:relative lg:top-auto lg:right-auto lg:h-auto lg:translate-x-0
              lg:transition-[width,border-color] lg:duration-300 lg:ease-in-out
              ${showRightSidebar ? "lg:w-80 lg:border-l-gray-600" : "lg:w-0 lg:border-l-0 lg:pointer-events-none"}
            `}
          >
            {/* Inner fixed-width container prevents content squishing during desktop width transition */}
            <div className="w-80 h-full flex flex-col overflow-hidden">
              {source.type === "dm" ? (
                <UserProfilePanel
                  className="flex-0 border-l border-l-gray-600 basis-72 bg-gray-725"
                  avatarClassName="border-4 border-gray-725 bg-gray-725"
                  userId={(detailsQuery.data as DmConversationDetails).peerProfile.id}
                />
              ) : (
                <ServerMemberList/>
              )}
            </div>
          </aside>
        </main>
      </div>
    </ChatContainerContextProvider>
  );
}

function DmHeader({toggleRightSidebar}: {toggleRightSidebar: () => void}) {
  const { detailsQuery } = useConversationContext();
  const peerProfile = (detailsQuery!.data as DmConversationDetails).peerProfile;

  return (
    <>
      <Avatar.User
        userId={peerProfile.id}
        alt={`Avatar of ${peerProfile.displayName} (@${peerProfile.userName})`}
        version={peerProfile.avatarVersion}
        className="flex-none rounded-full size-7"
      />

      <p className="flex-1">
        {peerProfile.displayName}

        {peerProfile.displayName !== peerProfile.userName ? (
          <span className="text-gray-400">{" "}(@{peerProfile.userName})</span>
        ) : null}
      </p>

      <div className="flex-none flex flex-row justify-center items-center gap-2">
        <ShowPinnedMessagesButton/>

        <IconButton theme="default" disabled>
          <FaSearch className="size-6"/>
        </IconButton>

        <IconButton theme="default" onClick={toggleRightSidebar}>
          <BsPersonFill className="size-6"/>
        </IconButton>
      </div>
    </>
  );
}

function ServerChannelHeader({toggleRightSidebar}: {toggleRightSidebar: () => void}) {
  const { detailsQuery } = useConversationContext();
  const channelIdentity = (detailsQuery!.data as ServerChannelConversationDetails).channelIdentity;

  return (
    <>
      {channelIdentity.channelType === ChannelType.Text ? (
        <BsChatTextFill className="flex-none fill-white size-7"/>
      ) : (
        <BsVolumeUp className="flex-none fill-white size-7"/>
      )}

      <p className="flex-1">
        {channelIdentity.name}
      </p>

      <div className="flex-none flex flex-row justify-center items-center gap-2">
        <ShowPinnedMessagesButton/>

        <IconButton theme="default" disabled>
          <FaSearch className="size-6"/>
        </IconButton>

        <IconButton theme="default" onClick={toggleRightSidebar}>
          <BsPeopleFill className="size-6"/>
        </IconButton>
      </div>
    </>
  );
}