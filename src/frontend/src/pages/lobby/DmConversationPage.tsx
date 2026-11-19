import { useState } from "react";
import { ConversationPageTemplate } from "../../components/conversation/ConversationPageTemplate.tsx";
import IconButton from "../../components/IconButton.tsx";
import useQueryDmConversationDetails from "../../hooks/useQueryDmConversationDetails.ts";
import { data, useLoaderData } from "react-router";
import Egg from "../../components/Egg.tsx";
import Spinner from "../../components/Spinner.tsx";
import { Avatar } from "../../components/Avatar.tsx";
import ChatContainerContextProvider from "../../contexts/ChatContainerContext.tsx";
import ChatInput from "../../components/conversation/ChatInput.tsx";
import TypingIndicator from "../../components/conversation/TypingIndicator.tsx";
import { ChatView } from "../../components/conversation/ChatView.tsx";
import UserProfilePanel from "../../components/UserProfilePanel.tsx";
import ShowPinnedMessagesButton from "../../components/ShowPinnedMessagesButton.tsx";
import SearchMessagesButton from "../../components/conversation/SearchMessagesButton.tsx";
import { BsPersonFill } from "react-icons/bs";
import useConversationConnection from "../../hooks/useConversationConnection.ts";
import type { DmConversationDetails } from "../../api/types.ts";

export interface DmConversationPageLoaderProps {
  peerId?: string;
}

export default function DmConversationPage() {
  const { peerId } = useLoaderData<DmConversationPageLoaderProps>();

  const {
    data,
    isLoading,
    isError,
    isEnabled,
  } = useQueryDmConversationDetails(peerId ?? "", {
    enabled: !!peerId,
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <ConversationPageTemplate.Template
        header={
          <div className="flex flex-row items-center justify-center gap-2 w-full">
            <div className="h-5 w-1/2 animate-pulse rounded-full bg-white/10"></div>
          </div>
        }
        main={
          <div className="flex size-full flex-row items-center justify-center">
            <Spinner className="size-16 fill-white" />
          </div>
        }
      />
    );
  }

  if (!isEnabled || isError || !data) {
    return <Secret />;
  }

  return <Success data={data}/>
}

function Success({data}: {data: DmConversationDetails}) {
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  useConversationConnection(data.conversationId);


  return (
    <ChatContainerContextProvider conversationId={data.conversationId}>
      <ConversationPageTemplate.Template
        header={
          <div className="flex w-full flex-row items-center justify-center gap-2">
            <Avatar.User
              userId={data.peerProfile.id}
              alt={`Avatar of ${data.peerProfile.displayName} (@${data.peerProfile.userName})`}
              version={data.peerProfile.avatarVersion}
              className="size-7 flex-none rounded-full"
            />

            <p className="flex-1">
              {data.peerProfile.displayName}
              {data.peerProfile.displayName !== data.peerProfile.userName ? (
                <span className="text-gray-400"> (@{data.peerProfile.userName})</span>
              ) : null}
            </p>

            <div className="flex flex-none flex-row items-center justify-center gap-2">
              <ShowPinnedMessagesButton />
              <SearchMessagesButton />

              <IconButton theme="default" onClick={() => setShowRightSidebar(!showRightSidebar)}>
                <BsPersonFill className="size-5" />
              </IconButton>
            </div>
          </div>
        }
        main={
          <div className="flex size-full flex-col gap-0">
            <ChatView />
            <TypingIndicator />
            <ChatInput />
          </div>
        }
        sidebar={{
          show: showRightSidebar,
          content: (
            <UserProfilePanel
              className="bg-gray-725 flex-0 basis-72 border-l border-l-gray-600"
              avatarClassName="border-4 border-gray-725 bg-gray-725"
              userId={data.peerProfile.id}
            />
          ),
        }}
      />
    </ChatContainerContextProvider>
  );
}

function Secret() {
  const [showEasterEgg] = useState(() => Math.random() <= 0.02);

  return (
    <>
      {showEasterEgg ? (
        <Egg />
      ) : (
        <ConversationPageTemplate.Template
          header={<p>Nobody here...</p>}
          main={
            <div className="flex size-full flex-row items-center justify-center">
              <p className="text-center text-sm text-gray-400 select-none">
                It is dead empty here... And it might be the same in the future...
              </p>
            </div>
          }
        />
      )}
    </>
  );
}