import {useCommunityServerChannelContext} from "../../contexts/CommunityServerChannelContext.tsx";

export default function ChannelPage() {
  const { channelSummary } = useCommunityServerChannelContext();

  return (
    <section className="size-full">
      <header className="h-10 bg-gray-750 border-b-2 border-b-gray-600 flex flex-row items-center px-2 select-none">
        {channelSummary ? (
          <span className="text-white">{channelSummary.name}</span>
        ) : (
          <span className="text-white">But nobody came...</span>
        )}
      </header>
    </section>
  );
}