import { useLoaderData } from "react-router";
import ConversationContextProvider, {
  type ConversationSource,
  useConversationContext,
} from "../contexts/ConversationContext.tsx";
import { Avatar } from "../components/Avatar.tsx";
import type {
  DmConversationDetails,
  ServerChannelConversationDetails,
} from "../api/types.ts";
import { ChannelType } from "../api/schema.ts";
import {
  BsChatTextFill,
  BsPeopleFill,
  BsPersonFill,
  BsVolumeUp,
} from "react-icons/bs";
import ChatContainerContextProvider from "../contexts/ChatContainerContext.tsx";
import { ChatView } from "../components/conversation/ChatView.tsx";
import TypingIndicator from "../components/conversation/TypingIndicator.tsx";
import ChatInput from "../components/conversation/ChatInput.tsx";
import useConversationConnection from "../hooks/useConversationConnection.ts";
import ShowPinnedMessagesButton from "../components/ShowPinnedMessagesButton.tsx";
import { FaSearch } from "react-icons/fa";
import IconButton from "../components/IconButton.tsx";
import { useState } from "react";
import UserProfilePanel from "../components/UserProfilePanel.tsx";
import ServerMemberList from "../components/server/ServerMemberList.tsx";
import SearchMessagesButton from "../components/conversation/SearchMessagesButton.tsx";

export default function ConversationPage() {
  const loaderData = useLoaderData<ConversationSource>();

  return (
    <ConversationContextProvider source={loaderData}>
      <ContextConsumer />
    </ConversationContextProvider>
  );
}

function ContextConsumer() {
  const { source, detailsQuery } = useConversationContext();

  return (
    <>
      {source.type === "invalid" ||
      !detailsQuery ||
      (detailsQuery && detailsQuery.isError) ? (
        <ErrorDisplay />
      ) : detailsQuery.isLoading ? (
        <LoadingDisplay />
      ) : (
        <SuccessDisplay />
      )}
    </>
  );
}

function LoadingDisplay() {
  return (
    <div className="flex size-full flex-col overflow-hidden bg-gray-700 text-white">
      <header className="bg-gray-750 flex h-11 flex-none flex-row items-center gap-2 border-b-2 border-b-gray-600 px-2 text-sm">
        <div className="size-7 flex-none animate-pulse rounded-full bg-white/10"></div>
        <div className="h-5 w-1/2 max-w-lg flex-1 animate-pulse rounded-full bg-white/10"></div>
      </header>
    </div>
  );
}

function ErrorDisplay() {
  return (
    <div className="flex size-full flex-col overflow-hidden bg-gray-700 text-white">
      <header className="bg-gray-750 flex h-11 flex-none flex-row items-center gap-2 border-b-2 border-b-gray-600 px-2 text-sm">
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
  };

  return (
    <ChatContainerContextProvider>
      <div className="flex size-full flex-col overflow-hidden bg-gray-700 text-white">
        <header className="bg-gray-750 flex h-11 flex-none flex-row items-center gap-2 border-b-2 border-b-gray-600 px-2 text-sm">
          {source.type === "dm" ? (
            <DmHeader toggleRightSidebar={toggleRightSidebar} />
          ) : source.type === "server-channel" ? (
            <ServerChannelHeader toggleRightSidebar={toggleRightSidebar} />
          ) : null}
        </header>

        <main className="relative flex size-full flex-1 flex-row overflow-hidden">
          <section className="flex min-w-0 flex-1 flex-col gap-0">
            <ChatView />
            <TypingIndicator />
            <ChatInput/>
          </section>

          <aside
            className={`bg-gray-725 absolute top-0 right-0 flex h-full w-80 flex-col border-l-2 border-l-gray-600 transition-transform duration-300 ease-in-out ${showRightSidebar ? "translate-x-0 shadow-2xl" : "pointer-events-none translate-x-full"} lg:relative lg:top-auto lg:right-auto lg:h-auto lg:translate-x-0 lg:transition-[width,border-color] lg:duration-300 lg:ease-in-out ${showRightSidebar ? "lg:w-80 lg:border-l-gray-600" : "lg:pointer-events-none lg:w-0 lg:border-l-0"} `}
          >
            {/* Inner fixed-width container prevents content squishing during desktop width transition */}
            <div className="flex h-full w-80 flex-col overflow-hidden">
              {source.type === "dm" ? (
                <UserProfilePanel
                  className="bg-gray-725 flex-0 basis-72 border-l border-l-gray-600"
                  avatarClassName="border-4 border-gray-725 bg-gray-725"
                  userId={
                    (detailsQuery.data as DmConversationDetails).peerProfile.id
                  }
                />
              ) : (
                <ServerMemberList />
              )}
            </div>
          </aside>
        </main>
      </div>
    </ChatContainerContextProvider>
  );
}

function DmHeader({ toggleRightSidebar }: { toggleRightSidebar: () => void }) {
  const { detailsQuery } = useConversationContext();
  const peerProfile = (detailsQuery!.data as DmConversationDetails).peerProfile;

  return (
    <>
      <Avatar.User
        userId={peerProfile.id}
        alt={`Avatar of ${peerProfile.displayName} (@${peerProfile.userName})`}
        version={peerProfile.avatarVersion}
        className="size-7 flex-none rounded-full"
      />

      <p className="flex-1">
        {peerProfile.displayName}

        {peerProfile.displayName !== peerProfile.userName ? (
          <span className="text-gray-400"> (@{peerProfile.userName})</span>
        ) : null}
      </p>

      <div className="flex flex-none flex-row items-center justify-center gap-2">
        <ShowPinnedMessagesButton />

        <SearchMessagesButton />

        <IconButton theme="default" onClick={toggleRightSidebar}>
          <BsPersonFill className="size-5" />
        </IconButton>
      </div>
    </>
  );
}

function ServerChannelHeader({
  toggleRightSidebar,
}: {
  toggleRightSidebar: () => void;
}) {
  const { detailsQuery } = useConversationContext();
  const channelIdentity = (
    detailsQuery!.data as ServerChannelConversationDetails
  ).channelIdentity;

  return (
    <>
      {channelIdentity.channelType === ChannelType.Text ? (
        <BsChatTextFill className="size-7 flex-none fill-white" />
      ) : (
        <BsVolumeUp className="size-7 flex-none fill-white" />
      )}

      <p className="flex-1">{channelIdentity.name}</p>

      <div className="flex flex-none flex-row items-center justify-center gap-2">
        <ShowPinnedMessagesButton />

        <IconButton theme="default" disabled>
          <FaSearch className="size-6" />
        </IconButton>

        <IconButton theme="default" onClick={toggleRightSidebar}>
          <BsPeopleFill className="size-6" />
        </IconButton>
      </div>
    </>
  );
}
