import type {CommunityServerSummaryDto} from "../api/responses.ts";
import {createContext, type ReactNode, useContext} from "react";

interface CommunityServerContextType {
  serverId: string;
  serverSummary: CommunityServerSummaryDto;

  appendChannelCategory: (id: string, name: string) => void;
  appendChannel: (id: string, name: string, type: "text" | "voice", categoryId: string | null) => void;
  removeChannelCategory: (id: string) => void;
  removeChannel: (id: string) => void;
}

const CommunityServerContext = createContext<CommunityServerContextType | null>(null);

export const useCommunityServerContext = () => {
  const context = useContext(CommunityServerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an ChatContainerContextProvider.");

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
}: CommunityServerContextProviderProps) {
  return (
    <CommunityServerContext.Provider value={{
      serverId,
      serverSummary,
      appendChannelCategory,
      appendChannel,
      removeChannelCategory,
      removeChannel,
    }}>
      {children}
    </CommunityServerContext.Provider>
  )
}