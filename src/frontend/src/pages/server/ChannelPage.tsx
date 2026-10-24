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
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {ServerChannelDeletedEvent} from "../../api/events.ts";
import {useState} from "react";
import TypingIndicator from "../../components/chat/TypingIndicator.tsx";

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

const CHANNEL_DISAPPEAR_TEXTS = [
  {header: "Signals lost in the void...", body: "This chat group was sucked into a black hole. Or maybe the owner just hit \"Delete\". Either way, it’s gone."},
  {header: "404: Room Not Found", body: "This chat vaporized into digital stardust. Even Quantum Computers can't recover this one."},
  {header: "Echoes of the past...", body: "Once a thriving hub of memes and chaotic typing, now just empty gray box."},
  {header: "Dust to dust...", body: "Someone clicked the big red button. Nothing remains but memories (and maybe a few regrets)..."},
  {header: "Poof! And it's gone.", body: "Looks like someone pulled the plug. Hope you didn't leave anything important in here!"},
  {header: "Well, this is awkward...", body: "Something happened and they took the whole living room with them."},
  {header: "Ghost Town.", body: "The party's over, and someone turned off the lights."},
]

function SuccessLayout() {
  const { hasPermission } = useCommunityServerContext();
  const { channelDetails } = useServerChannelContext();
  
  const [disappearTexts, setDisappearTexts] = useState<typeof CHANNEL_DISAPPEAR_TEXTS[number] | undefined>(undefined);
  
  useConversationConnection(channelDetails?.conversationId);

  useSignalREvent("ServerChannelDeleted", (event: ServerChannelDeletedEvent) => {
    if (event.channelId !== channelDetails.id) {
      return;
    }

    setDisappearTexts(CHANNEL_DISAPPEAR_TEXTS[Math.floor(Math.random() * CHANNEL_DISAPPEAR_TEXTS.length)]);
  });
  
  return (
    <section className="size-full flex flex-col">
      <header className="flex-none basis-10 bg-gray-750 border-b-2 border-b-gray-600 flex flex-row items-center gap-2 px-2 select-none">
        {disappearTexts ? (
          <span className="text-white">{disappearTexts.header}</span>
        ) : (
          <>
            { channelDetails.type === ChannelType.Text ? (
              <BsChatText className="size-6 fill-white"/>
            ) : (
              <BsVolumeUp className="size-6 fill-white"/>
            )}

            <span className="text-white">{channelDetails!.name}</span>
          </>
        )}
      </header>

      <main className="flex-1 min-h-0 flex flex-row relative gap-0">
        {disappearTexts ? (
          <div className="size-full text-sm flex flex-col justify-center items-center gap-2 text-center">
            <span className="text-gray-400">{disappearTexts.body}</span>
          </div>
        ) : (
          <ChatContainerContextProvider
            conversationId={channelDetails!.conversationId}
          >
            <div className="flex flex-col flex-1">
              <ChatView
                allowEditMessage={hasPermission(ServerPermission.EditMessages)}
                allowDeleteMessage={hasPermission(ServerPermission.DeleteMessages)}
              />
  
              {hasPermission(ServerPermission.SendMessage) && (
                <>
                  <TypingIndicator/>
                  <ChatInput/>
                </>
              )}
            </div>
          </ChatContainerContextProvider>
        )}
      </main>
    </section>
  );
}