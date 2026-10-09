import {createContext, type ReactNode, useContext} from "react";
import type {ChannelDetailsDto} from "../api/types.ts";

interface ServerChannelContextType {
  channelDetails: ChannelDetailsDto;
}

const ServerChannelContext = createContext<ServerChannelContextType | null>(null);

interface CommunityServerChannelContextProviderProps {
  children: ReactNode;
  channelDetails: ChannelDetailsDto;
}

export default function ServerChannelContextProvider({
  children,
  channelDetails,
}: CommunityServerChannelContextProviderProps) {
  return (
    <ServerChannelContext.Provider value={{
      channelDetails
    }}>
      {children}
    </ServerChannelContext.Provider>
  )
}

export function useServerChannelContext(): ServerChannelContextType {
  const context = useContext(ServerChannelContext);
  if (!context) throw new Error("useCommunityServerChannelContext must be used within an CommunityServerChannelContextProvider.");

  return context;
}