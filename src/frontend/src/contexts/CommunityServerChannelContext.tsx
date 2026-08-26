import {createContext, type ReactNode, useContext} from "react";
import type {CommunityServerChannelIdentityDto} from "../api/responses.ts";
import {useCommunityServerContext} from "./CommunityServerContext.tsx";
import useChannelConnection from "../hooks/useChannelConnection.ts";

interface CommunityServerChannelContextType {
  channelSummary: CommunityServerChannelIdentityDto | undefined;
}

const CommunityServerChannelContext = createContext<CommunityServerChannelContextType | null>(null);

export const useCommunityServerChannelContext = () => {
  const context = useContext(CommunityServerChannelContext);
  if (!context) throw new Error("useCommunityServerChannelContext must be used within an CommunityServerChannelContextProvider.");

  return context;
}

interface CommunityServerChannelContextProviderProps {
  children: ReactNode;
  channelId: string | undefined;
}

export default function CommunityServerChannelContextProvider({
  children,
  channelId
}: CommunityServerChannelContextProviderProps) {
  const { serverSummary: { channelCategories } } = useCommunityServerContext();

  let channelSummary: CommunityServerChannelIdentityDto | undefined = undefined;

  if (channelId != null) {
    for (const category of channelCategories) {
      channelSummary = category.channels.find((c) => c.id === channelId);

      if (channelSummary) {
        break;
      }
    }
  }

  useChannelConnection(channelId);

  return (
    <CommunityServerChannelContext.Provider value={{
      channelSummary
    }}>
      {children}
    </CommunityServerChannelContext.Provider>
  )
}