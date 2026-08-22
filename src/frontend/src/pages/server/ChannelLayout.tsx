import CommunityServerChannelContextProvider from "../../contexts/CommunityServerChannelContext.tsx";
import {Outlet, useParams} from "react-router";

export default function ChannelLayout() {
  const { channelId } = useParams();

  return (
    <CommunityServerChannelContextProvider channelId={channelId}>
      <Outlet/>
    </CommunityServerChannelContextProvider>
  )
}