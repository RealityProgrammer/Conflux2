import {createContext, type ReactNode, useContext} from "react";
import type {CommunityServerChannelSummaryDto} from "../api/responses.ts";
import {useCommunityServerContext} from "./CommunityServerContext.tsx";

interface CommunityServerChannelContextType {
  channelSummary: CommunityServerChannelSummaryDto | undefined;
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

  let channelSummary: CommunityServerChannelSummaryDto | undefined = undefined;

  if (channelId != null) {
    for (const category of channelCategories) {
      channelSummary = category.channels.find((c) => c.id === channelId);

      if (channelSummary) {
        break;
      }
    }
  }

  return (
    <CommunityServerChannelContext.Provider value={{
      channelSummary
    }}>
      {children}
    </CommunityServerChannelContext.Provider>
  )
}