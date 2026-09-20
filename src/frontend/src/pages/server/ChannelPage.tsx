import {useCommunityServerChannelContext} from "../../contexts/CommunityServerChannelContext.tsx";
import ChatContainer from "../../components/chat/ChatContainer.tsx";

export default function ChannelPage() {
  const { channelSummary } = useCommunityServerChannelContext();

  if (!channelSummary) {
    return (
      <section className="size-full flex flex-col select-none">
        <header className="flex-none basis-10 bg-gray-750 border-b-2 border-b-gray-600 flex flex-row items-center px-2">
          <span className="text-white">But nobody came...</span>
        </header>

        <main className="flex-1 flex flex-row justify-center items-center">
          <span className="text-gray-500">...</span>
        </main>
      </section>
    );
  }

  return (
    <SuccessLayout/>
  );
}

function SuccessLayout() {
  const { channelSummary } = useCommunityServerChannelContext();

  return (
    <section className="size-full flex flex-col">
      <header className="flex-none basis-10 bg-gray-750 border-b-2 border-b-gray-600 flex flex-row items-center px-2 select-none">
        <span className="text-white">{channelSummary!.name}</span>
      </header>

      <main className="flex-1 min-h-0 flex flex-row relative gap-0">
        <ChatContainer channelId={channelSummary!.id}/>
      </main>
    </section>
  );
}