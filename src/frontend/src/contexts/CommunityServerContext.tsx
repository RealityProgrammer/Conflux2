import type {ServerDetailDto} from "../api/types.ts";
import {createContext, type ReactNode, useContext} from "react";
import useServerConnection from "../hooks/useServerConnection.ts";
import type {ServerMemberAuthorizeInfo} from "../hooks/useServerMemberAuthorizeInfo.tsx";

interface CommunityServerContextType {
  serverId: string;
  serverSummary: ServerDetailDto;

  appendChannelCategory: (id: string, name: string) => void;
  appendChannel: (id: string, name: string, type: "text" | "voice", categoryId: string | null) => void;
  removeChannelCategory: (id: string) => void;
  removeChannel: (id: string) => void;

  memberAuthorizeInfo: ServerMemberAuthorizeInfo;
}

const CommunityServerContext = createContext<CommunityServerContextType | null>(null);

export const useCommunityServerContext = () => {
  const context = useContext(CommunityServerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an CommunityServerContextProvider.");

  return context;
}

interface CommunityServerContextProviderProps extends CommunityServerContextType {
  children: ReactNode;
}

export default function CommunityServerContextProvider({
  children,
  serverId,
  serverSummary,
  appendChannelCategory,
  appendChannel,
  removeChannelCategory,
  removeChannel,
  memberAuthorizeInfo,
}: CommunityServerContextProviderProps) {
  useServerConnection(serverId);

  return (
    <CommunityServerContext.Provider value={{
      serverId,
      serverSummary,
      appendChannelCategory,
      appendChannel,
      removeChannelCategory,
      removeChannel,
      memberAuthorizeInfo,
    }}>
      {children}
    </CommunityServerContext.Provider>
  )
}