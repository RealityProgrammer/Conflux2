import {useCommunityServerChannelContext} from "../../contexts/CommunityServerChannelContext.tsx";

export default function ChannelPage() {
  const { channelSummary } = useCommunityServerChannelContext();

  return (
    <section className="size-full">
      <header className="h-10 bg-gray-750 border-b-2 border-b-gray-600 flex flex-row items-center px-2 select-none">
        <span className="text-white"><i>Insert channel name {channelSummary?.id}</i></span>
      </header>
    </section>
  );
}