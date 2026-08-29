import type {CommunityServerSummaryDto, ServerMemberPermissionsDto} from "../api/types.ts";
import {createContext, type ReactNode, useContext} from "react";
import useServerConnection from "../hooks/useServerConnection.ts";

interface CommunityServerContextType {
  serverId: string;
  serverSummary: CommunityServerSummaryDto;

  appendChannelCategory: (id: string, name: string) => void;
  appendChannel: (id: string, name: string, type: "text" | "voice", categoryId: string | null) => void;
  removeChannelCategory: (id: string) => void;
  removeChannel: (id: string) => void;

  memberPermissions: ServerMemberPermissionsDto;
  updateMemberPermissions: (update: Partial<Omit<ServerMemberPermissionsDto, "memberId">>) => void;
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
  memberPermissions,
  updateMemberPermissions,
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
      memberPermissions,
      updateMemberPermissions,
    }}>
      {children}
    </CommunityServerContext.Provider>
  )
}