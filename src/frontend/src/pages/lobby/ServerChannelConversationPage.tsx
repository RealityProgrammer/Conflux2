import { useState } from "react";
import { ConversationPageTemplate } from "../../components/conversation/ConversationPageTemplate.tsx";
import IconButton from "../../components/IconButton.tsx";
import Egg from "../../components/Egg.tsx";
import useQueryServerChannelConversationDetails from "../../hooks/useQueryServerChannelConversationDetails.ts";
import { useLoaderData } from "react-router";
import Spinner from "../../components/Spinner.tsx";
import ChatContainerContextProvider from "../../contexts/ChatContainerContext.tsx";
import { ChannelType, ServerPermission } from "../../api/schema.ts";
import { BsChatTextFill, BsPeopleFill, BsVolumeUp } from "react-icons/bs";
import ShowPinnedMessagesButton from "../../components/ShowPinnedMessagesButton.tsx";
import SearchMessagesButton from "../../components/conversation/SearchMessagesButton.tsx";
import ServerMemberList from "../../components/server/ServerMemberList.tsx";
import { ChatView } from "../../components/conversation/ChatView.tsx";
import TypingIndicator from "../../components/conversation/TypingIndicator.tsx";
import ChatInput from "../../components/conversation/ChatInput.tsx";
import { useCommunityServerContext } from "../../contexts/CommunityServerContext.tsx";
import useConversationConnection from "../../hooks/useConversationConnection.ts";
import type { ServerChannelConversationDetails } from "../../api/types.ts";

export interface ServerChannelConversationPageLoaderProps {
  serverId?: string;
  channelId?: string;
}

export default function ServerChannelConversationPage() {
  const { serverId, channelId } =
    useLoaderData<ServerChannelConversationPageLoaderProps>();

  const { data, isLoading, isError, isEnabled } =
    useQueryServerChannelConversationDetails(
      { serverId: serverId ?? "", channelId: channelId ?? "" },
      {
        enabled: !!serverId && !!channelId,
        staleTime: 30 * 60 * 1000,
      },
    );

  if (isLoading) {
    return (
      <ConversationPageTemplate.Template
        header={
          <div className="flex w-full flex-row items-center justify-center gap-2">
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

  return <Success serverId={serverId!} data={data} />
}

function Success({ serverId, data }: { serverId: string; data: ServerChannelConversationDetails; }) {
  useConversationConnection(data.conversationId);
  const { hasPermission } = useCommunityServerContext();
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  return (
    <ChatContainerContextProvider conversationId={data.conversationId}>
      <ConversationPageTemplate.Template
        header={
          <div className="flex w-full flex-row items-center justify-center gap-2">
            {data.channelIdentity.channelType === ChannelType.Text ? (
              <BsChatTextFill className="size-7 flex-none fill-white" />
            ) : (
              <BsVolumeUp className="size-7 flex-none fill-white" />
            )}

            <p className="flex-1">{data.channelIdentity.name}</p>

            <div className="flex flex-none flex-row items-center justify-center gap-2">
              <ShowPinnedMessagesButton />
              <SearchMessagesButton />
              <IconButton
                theme="default"
                onClick={() => setShowRightSidebar(!showRightSidebar)}
              >
                <BsPeopleFill className="size-5" />
              </IconButton>
            </div>
          </div>
        }
        main={
          <div className="flex size-full flex-col gap-0">
            <ChatView />
            <TypingIndicator />
            <ChatInput
              disabled={!hasPermission(ServerPermission.SendMessage)}
            />
          </div>
        }
        sidebar={{
          show: showRightSidebar,
          content: <ServerMemberList serverId={serverId!} />,
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
                It is dead empty here... And it might be the same in the
                future...
              </p>
            </div>
          }
        />
      )}
    </>
  );
}
