import type {ServerSummaryDto} from "../api/types.ts";
import {createContext, type ReactNode, useContext} from "react";
import useServerConnection from "../hooks/useServerConnection.ts";
import type {ServerMemberAuthorizeInfo} from "../hooks/useServerMemberAuthorizeInfo.ts";

interface CommunityServerContextType {
  serverId: string;
  serverSummary: ServerSummaryDto;

  appendChannelCategory: (id: string, name: string) => void;
  removeChannelCategory: (id: string) => void;
  removeChannel: (id: string) => void;
  invalidateSummary: () => void;

  memberAuthorizeInfo: ServerMemberAuthorizeInfo;
}

const CommunityServerContext = createContext<CommunityServerContextType | null>(null);

interface CommunityServerContextProviderProps extends CommunityServerContextType {
  children: ReactNode;
}

export default function CommunityServerContextProvider({
  children,
  serverId,
  serverSummary,
  appendChannelCategory,
  removeChannelCategory,
  removeChannel,
  invalidateSummary,
  memberAuthorizeInfo,
}: CommunityServerContextProviderProps) {
  useServerConnection(serverId);

  return (
    <CommunityServerContext.Provider value={{
      serverId,
      serverSummary,
      appendChannelCategory,
      removeChannelCategory,
      removeChannel,
      invalidateSummary,
      memberAuthorizeInfo,
    }}>
      {children}
    </CommunityServerContext.Provider>
  )
}

export function useCommunityServerContext(): CommunityServerContextType {
  const context = useContext(CommunityServerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an CommunityServerContextProvider.");

  return context;
}