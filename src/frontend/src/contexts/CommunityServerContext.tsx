import type {CommunityServerSummaryDto} from "../api/responses.ts";
import {createContext, type ReactNode, useContext} from "react";

interface CommunityServerContextType {
  serverId: string;
  serverSummary: CommunityServerSummaryDto;
}

const CommunityServerContext = createContext<CommunityServerContextType | null>(null);

interface CommunityServerContextProviderProps extends CommunityServerContextType {
  children: ReactNode;
}

export default function CommunityServerContextProvider({
  children,
  ...props
}: CommunityServerContextProviderProps) {
  return (
    <CommunityServerContext.Provider value={props}>
      {children}
    </CommunityServerContext.Provider>
  )
}

export const useCommunityServerContext = () => {
  const context = useContext(CommunityServerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an ChatContainerContextProvider.");

  return context;
}