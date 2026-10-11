import {ChatView} from "../../components/chat/ChatView.tsx";
import ChatInput from "../../components/chat/ChatInput.tsx";
import ChatContainerContextProvider from "../../contexts/ChatContainerContext.tsx";
import Spinner from "../../components/Spinner.tsx";
import {useQuery} from "@tanstack/react-query";
import {useParams} from "react-router";
import {communityServerService} from "../../api/communityServerService.ts";
import {useCommunityServerContext} from "../../contexts/CommunityServerContext.tsx";
import {BsChatText, BsExclamationTriangle, BsVolumeUp} from "react-icons/bs";
import ServerChannelContextProvider, {useServerChannelContext} from "../../contexts/ServerChannelContext.tsx";
import useConversationConnection from "../../hooks/useConversationConnection.ts";
import {ChannelType, ServerPermission} from "../../api/schema.ts";

export default function ChannelPage() {
  const { detailsQueryResult: { data: serverDetails } } = useCommunityServerContext();
  const { channelId } = useParams();
  
  const { data: channelDetails, isLoading, isError } = useQuery({
    enabled: !!channelId,
    queryKey: ["channelDetails", channelId],
    queryFn: () => {
      return communityServerService.getChannelDetails(serverDetails!.id, channelId!);
    },
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center">
        <Spinner className="size-12 fill-white"/>
      </div>
    );
  }

  if (isError || !channelDetails || !channelDetails.data) {
    return (
      <div className="flex flex-col justify-center items-center gap-2">
        <BsExclamationTriangle className="size-12 fill-white"/>
        <span className="select-none text-white">Failed to get channel details</span>
      </div>
    );
  }
  
  return (
    <ServerChannelContextProvider 
      channelDetails={channelDetails.data}
    >
      <SuccessLayout/>
    </ServerChannelContextProvider>
  );
}

function SuccessLayout() {
  const { hasPermission } = useCommunityServerContext();
  const { channelDetails } = useServerChannelContext();
  
  useConversationConnection(channelDetails?.conversationId);
  
  return (
    <section className="size-full flex flex-col">
      <header className="flex-none basis-10 bg-gray-750 border-b-2 border-b-gray-600 flex flex-row items-center gap-2 px-2 select-none">
        { channelDetails.type === ChannelType.Text ? (
          <BsChatText className="size-6 fill-white"/>
        ) : (
          <BsVolumeUp className="size-6 fill-white"/>
        )}
        
        <span className="text-white">{channelDetails!.name}</span>
      </header>

      <main className="flex-1 min-h-0 flex flex-row relative gap-0">
        <ChatContainerContextProvider
          conversationId={channelDetails!.conversationId}
        >
          <div className="flex flex-col flex-1">
            <ChatView
              allowEditMessage={hasPermission(ServerPermission.EditMessages)}
              allowDeleteMessage={hasPermission(ServerPermission.DeleteMessages)}
            />

            {hasPermission(ServerPermission.SendMessage) && (
              <ChatInput/>
            )}
          </div>
        </ChatContainerContextProvider>
      </main>
    </section>
  );
}